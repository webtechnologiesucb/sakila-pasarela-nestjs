import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/response.dto';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    role?: UserRole,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.is_active = isActive;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: PUBLIC_USER_SELECT,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    return this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        password_hash: await bcrypt.hash(dto.password, 12),
        role: dto.role || UserRole.STAFF,
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    await this.findOne(id);

    if (dto.is_active === false && actorId === id) {
      throw new BadRequestException('Un usuario no puede desactivar su propia cuenta');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.password && {
          password_hash: await bcrypt.hash(dto.password, 12),
        }),
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  async deactivate(id: string, actorId?: string) {
    return this.update(id, { is_active: false }, actorId);
  }
}
