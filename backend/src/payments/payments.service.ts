import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentSimulatorService,
  BOLIVIAN_WALLET_CODES,
  maskPayerIdentifier,
  normalizeBolivianMobile,
} from './simulator/payment-simulator.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { paginate } from '../common/dto/response.dto';
import { OrderStatus, TransactionStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private simulator: PaymentSimulatorService,
  ) {}

  /**
   * Process payment with full idempotency support.
   * Same idempotency_key + same params → returns cached result.
   * Same idempotency_key + different params → rejects with 409.
   */
  async processPayment(dto: CreatePaymentDto, idempotencyKey: string) {
    // ── Idempotency check ────────────────────────────────────────
    const existingTxn = await this.prisma.paymentTransaction.findUnique({
      where: { idempotency_key: idempotencyKey },
      include: { payment_method: true, order: true },
    });

    if (existingTxn) {
      // Same key, check if it's the same request
      const amountMatch = existingTxn.amount.equals(new Prisma.Decimal(dto.amount));
      const orderMatch = existingTxn.order_id === dto.order_id;
      const methodMatch = existingTxn.payment_method_id === dto.payment_method_id;
      const payerMatch =
        (existingTxn.payer_identifier ?? null) ===
        maskPayerIdentifier(dto.payer_identifier);

      if (!amountMatch || !orderMatch || !methodMatch || !payerMatch) {
        throw new ConflictException(
          'La clave de idempotencia ya existe con parámetros diferentes. Use una nueva clave para reintentar.',
        );
      }

      this.logger.log(`[IDEMPOTENCY] Returning cached result for key: ${idempotencyKey.substring(0, 20)}...`);
      return existingTxn;
    }

    // ── Validate order ───────────────────────────────────────────
    const order = await this.prisma.order.findUnique({
      where: { id: dto.order_id },
    });

    if (!order) {
      throw new NotFoundException(`Orden ${dto.order_id} no encontrada`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Una orden cancelada no puede recibir pagos');
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('La orden ya fue pagada');
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('La orden ya fue reembolsada');
    }

    // ── Validate payment method ──────────────────────────────────
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id: dto.payment_method_id, is_active: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Método de pago no encontrado o inactivo');
    }

    // ── Validate payer identifier (billeteras móviles) ───────────
    let payerIdentifier: string | null = dto.payer_identifier?.trim() || null;
    const isMobileWallet = BOLIVIAN_WALLET_CODES.includes(paymentMethod.code);

    if (isMobileWallet) {
      const mobile = normalizeBolivianMobile(payerIdentifier);
      if (!mobile) {
        throw new BadRequestException(
          `Número de celular inválido para ${paymentMethod.name}. Use 8 dígitos que inicien con 6 o 7 (ej. 71234567 o +59171234567).`,
        );
      }
      payerIdentifier = mobile;
    }

    const maskedPayerIdentifier = maskPayerIdentifier(payerIdentifier);

    // ── Validate amount matches order total ──────────────────────
    const orderTotal = order.total;
    const requestedAmount = new Prisma.Decimal(dto.amount);

    if (!requestedAmount.equals(orderTotal)) {
      throw new BadRequestException(
        `El importe no coincide con el total de la orden. Esperado: ${orderTotal}, recibido: ${requestedAmount}`,
      );
    }

    // ── Create PENDING transaction ────────────────────────────────
    const transactionRef = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.paymentTransaction.create({
        data: {
          order_id: dto.order_id,
          transaction_ref: transactionRef,
          idempotency_key: idempotencyKey,
          amount: requestedAmount,
          currency: order.currency,
          payment_method_id: dto.payment_method_id,
          status: TransactionStatus.PENDING,
          payer_identifier: maskedPayerIdentifier,
          metadata: {
            ...(dto.test_token ? { test_token: dto.test_token } : {}),
            provider: paymentMethod.provider,
            method_code: paymentMethod.code,
            ...(maskedPayerIdentifier ? { payer_identifier: maskedPayerIdentifier } : {}),
          },
        },
        include: { payment_method: true },
      });

      // Update order to CONFIRMED
      await tx.order.update({
        where: { id: dto.order_id },
        data: { status: OrderStatus.CONFIRMED },
      });

      return txn;
    });

    // ── Simulate payment processing ──────────────────────────────
    try {
      // Update to PROCESSING
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.PROCESSING },
      });

      const result = await this.simulator.simulatePayment(
        Number(requestedAmount),
        paymentMethod.code,
        idempotencyKey,
        dto.test_token,
        payerIdentifier,
      );

      // ── Record result ──────────────────────────────────────────
      const finalStatus = result.approved
        ? TransactionStatus.SUCCEEDED
        : TransactionStatus.FAILED;

      const [updatedTxn] = await this.prisma.$transaction([
        this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: finalStatus,
            response_code: result.responseCode,
            response_message: result.message,
            provider_reference: result.providerReference ?? null,
          },
          include: { payment_method: true, refunds: true },
        }),
        this.prisma.order.update({
          where: { id: dto.order_id },
          data: {
            status: result.approved ? OrderStatus.PAID : OrderStatus.PENDING,
          },
        }),
      ]);

      this.logger.log(
        `[PAYMENT] ${result.approved ? '✅' : '❌'} ${transactionRef} → ${result.responseCode}`,
      );

      return updatedTxn;
    } catch (error) {
      // Mark as failed if simulator throws
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          response_code: 'SYSTEM_ERROR',
          response_message: 'Error interno del sistema de simulación',
        },
      });
      throw error;
    }
  }

  async findOne(id: string) {
    const txn = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        payment_method: true,
        order: {
          include: {
            customer: { select: { customer_id: true, first_name: true, last_name: true } },
          },
        },
        refunds: true,
      },
    });

    if (!txn) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }

    return txn;
  }

  async findStatus(id: string) {
    const txn = await this.findOne(id);
    return {
      id: txn.id,
      transaction_ref: txn.transaction_ref,
      status: txn.status,
      amount: txn.amount,
      currency: txn.currency,
      response_code: txn.response_code,
      response_message: txn.response_message,
      provider_reference: txn.provider_reference,
      payer_identifier: txn.payer_identifier,
      created_at: txn.created_at,
      updated_at: txn.updated_at,
    };
  }

  async findMethods() {
    return this.prisma.paymentMethod.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    status?: TransactionStatus,
    orderId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.PaymentTransactionWhereInput = {
      ...(status && { status }),
      ...(orderId && { order_id: orderId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          payment_method: true,
          order: {
            include: {
              customer: { select: { first_name: true, last_name: true } },
            },
          },
          refunds: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }
}
