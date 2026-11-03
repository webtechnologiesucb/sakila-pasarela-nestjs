import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/response.dto';

export interface AuditRecordInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Persist an audit record. Audit failures must never break the main
   * business operation, therefore every error is swallowed and logged.
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: input.userId || null,
          action: input.action,
          entity_type: input.entityType,
          entity_id: input.entityId ? String(input.entityId) : null,
          old_values: this.toJson(input.oldValues),
          new_values: this.toJson(input.newValues),
          ip_address: input.ipAddress || null,
          user_agent: input.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la auditoría: ${(error as Error).message}`,
      );
    }
  }

  async findAll(query: AuditQuery = {}) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.userId) where.user_id = query.userId;
    if (query.entityType) where.entity_type = query.entityType;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.from || query.to) {
      where.created_at = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true, role: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
