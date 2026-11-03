import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { paginate } from '../common/dto/response.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<any> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La orden debe tener al menos un producto');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { customer_id: dto.customer_id },
    });
    if (!customer) {
      throw new NotFoundException(`Cliente ${dto.customer_id} no encontrado`);
    }

    // Fetch films and calculate prices (backend always calculates prices)
    const filmIds = dto.items.map((i) => i.film_id);
    const uniqueFilmIds = Array.from(new Set(filmIds));
    const films = await this.prisma.film.findMany({
      where: { film_id: { in: uniqueFilmIds } },
    });

    if (films.length !== uniqueFilmIds.length) {
      throw new NotFoundException('Uno o más productos no encontrados');
    }

    const filmMap = new Map(films.map((f) => [f.film_id, f]));

    // Calculate items with frozen prices
    let subtotal = new Prisma.Decimal(0);
    const orderItems = dto.items.map((item) => {
      const film = filmMap.get(item.film_id)!;
      const unitPrice = film.rental_rate; // frozen price from DB
      const lineSubtotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineSubtotal);

      return {
        id: uuidv4(),
        film_id: item.film_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: lineSubtotal,
      };
    });

    const tax = subtotal.mul(0); // No tax in demo (can be configured)
    const total = subtotal.add(tax);

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Create order with items in a transaction
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          order_number: orderNumber,
          customer_id: dto.customer_id,
          currency: 'BOB',
          subtotal,
          tax,
          total,
          notes: dto.notes,
          order_items: {
            create: orderItems,
          },
        },
        include: {
          customer: {
            select: { customer_id: true, first_name: true, last_name: true, email: true },
          },
          order_items: {
            include: {
              film: { select: { film_id: true, title: true, rental_rate: true } },
            },
          },
        },
      });
      return order;
    });
  }

  async findAll(page = 1, limit = 20, customerId?: number, status?: OrderStatus) {
    if (status && !Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException(`Estado de orden inválido: ${status}`);
    }

    const skip = (page - 1) * limit;
    const where: any = {};
    if (customerId) where.customer_id = customerId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { customer_id: true, first_name: true, last_name: true, email: true },
          },
          _count: { select: { order_items: true, payment_transactions: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            customer_id: true, first_name: true, last_name: true, email: true,
          },
        },
        order_items: {
          include: {
            film: { select: { film_id: true, title: true, description: true } },
          },
        },
        payment_transactions: {
          orderBy: { created_at: 'desc' },
          include: { payment_method: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden ${id} no encontrada`);
    }

    return order;
  }

  async cancel(id: string) {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Una orden pagada no puede cancelarse directamente. Solicite un reembolso.');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('La orden ya está cancelada');
    }
    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('La orden ya fue reembolsada');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  async findOrderPayments(orderId: string) {
    await this.findOne(orderId);

    return this.prisma.paymentTransaction.findMany({
      where: { order_id: orderId },
      include: {
        payment_method: true,
        refunds: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count();
    const seq = String(count + 1).padStart(6, '0');
    return `ORD-${year}-${seq}`;
  }
}
