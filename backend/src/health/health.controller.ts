import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y conectividad de base de datos' })
  async check() {
    const startedAt = Date.now();
    let database = 'up';
    let databaseLatencyMs: number | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - startedAt;
    } catch {
      database = 'down';
    }

    return {
      success: database === 'up',
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'sakila-pasarela-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: database,
        latency_ms: databaseLatencyMs,
      },
      demo_mode: true,
    };
  }
}
