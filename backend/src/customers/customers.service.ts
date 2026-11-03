import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { paginate } from '../common/dto/response.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' as any } },
            { last_name: { contains: search, mode: 'insensitive' as any } },
            { email: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: { select: { store_id: true } },
          address: {
            include: { city: { include: { country: true } } },
          },
          _count: { select: { orders: true, rentals: true } },
        },
        orderBy: { last_name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { customer_id: id },
      include: {
        store: true,
        address: { include: { city: { include: { country: true } } } },
        orders: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }

    // Use default address if not provided
    const addressId = dto.address_id || 5;
    const storeId = dto.store_id || 1;

    return this.prisma.customer.create({
      data: {
        first_name: dto.first_name.toUpperCase(),
        last_name: dto.last_name.toUpperCase(),
        email: dto.email,
        address_id: addressId,
        store_id: storeId,
        active: true,
      },
      include: {
        address: { include: { city: { include: { country: true } } } },
      },
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { email: dto.email, NOT: { customer_id: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe otro cliente con ese email');
      }
    }

    return this.prisma.customer.update({
      where: { customer_id: id },
      data: {
        ...(dto.first_name && { first_name: dto.first_name.toUpperCase() }),
        ...(dto.last_name && { last_name: dto.last_name.toUpperCase() }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: {
        address: { include: { city: { include: { country: true } } } },
      },
    });
  }
}
