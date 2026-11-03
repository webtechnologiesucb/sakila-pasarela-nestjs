import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/response.dto';

@Injectable()
export class FilmsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string, categoryId?: number) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) {
      where.film_categories = {
        some: { category_id: categoryId },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.film.findMany({
        where,
        skip,
        take: limit,
        include: {
          film_categories: {
            include: { category: { select: { name: true } } },
          },
          _count: { select: { inventories: true } },
        },
        orderBy: { title: 'asc' },
      }),
      this.prisma.film.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: number) {
    const film = await this.prisma.film.findUnique({
      where: { film_id: id },
      include: {
        language: true,
        film_categories: { include: { category: true } },
        film_actors: { include: { actor: true } },
        _count: { select: { inventories: true } },
      },
    });

    if (!film) {
      throw new NotFoundException(`Película con ID ${id} no encontrada`);
    }

    return film;
  }

  async findCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { film_categories: true } },
      },
    });
  }
}
