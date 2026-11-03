import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSimulatorService } from '../payments/simulator/payment-simulator.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { TransactionStatus, RefundStatus, OrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private simulator: PaymentSimulatorService,
  ) {}

  async createRefund(transactionId: string, dto: CreateRefundDto) {
    // ── Validate transaction ─────────────────────────────────────
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: {
        refunds: true,
        order: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción ${transactionId} no encontrada`);
    }

    if (transaction.status !== TransactionStatus.SUCCEEDED) {
      throw new BadRequestException(
        'Solo se pueden reembolsar transacciones exitosas (SUCCEEDED)',
      );
    }

    // ── Calculate available refund amount ────────────────────────
    const totalRefunded = transaction.refunds
      .filter((r) => r.status === RefundStatus.SUCCEEDED)
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

    const available = transaction.amount.sub(totalRefunded);
    const refundAmount = new Prisma.Decimal(dto.amount);

    if (refundAmount.greaterThan(available)) {
      throw new BadRequestException(
        `Importe de reembolso (${refundAmount}) supera el disponible (${available}). Total pagado: ${transaction.amount}, ya reembolsado: ${totalRefunded}`,
      );
    }

    if (refundAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('El importe del reembolso debe ser positivo');
    }

    // ── Create refund with idempotency via unique reference ───────
    const refundReference = `REF-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const refund = await this.prisma.refund.create({
      data: {
        transaction_id: transactionId,
        amount: refundAmount,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        reference: refundReference,
      },
    });

    // ── Simulate refund processing ────────────────────────────────
    try {
      const result = await this.simulator.simulateRefund(
        Number(transaction.amount),
        Number(refundAmount),
        refundReference,
      );

      const finalStatus = result.approved
        ? RefundStatus.SUCCEEDED
        : RefundStatus.FAILED;

      // ── Update refund and order status in transaction ─────────
      const isTotalRefund = refundAmount.equals(transaction.amount);
      const isFullyRefunded = totalRefunded.add(refundAmount).equals(transaction.amount);

      const [updatedRefund] = await this.prisma.$transaction([
        this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: finalStatus,
            response_code: result.responseCode,
            response_message: result.message,
          },
        }),
        ...(result.approved
          ? [
              this.prisma.order.update({
                where: { id: transaction.order_id },
                data: {
                  status: isFullyRefunded
                    ? OrderStatus.REFUNDED
                    : OrderStatus.PARTIALLY_REFUNDED,
                },
              }),
            ]
          : []),
      ]);

      this.logger.log(
        `[REFUND] ${result.approved ? '✅' : '❌'} ${refundReference} → ${result.responseCode}`,
      );

      return updatedRefund;
    } catch (error) {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          response_code: 'SYSTEM_ERROR',
          response_message: 'Error interno al procesar el reembolso',
        },
      });
      throw error;
    }
  }

  async findRefundsByTransaction(transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción ${transactionId} no encontrada`);
    }

    return this.prisma.refund.findMany({
      where: { transaction_id: transactionId },
      orderBy: { created_at: 'desc' },
    });
  }
}
