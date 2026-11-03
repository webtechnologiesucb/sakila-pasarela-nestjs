import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { success } from '../common/dto/response.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.VIEWER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas agregadas del dashboard' })
  async dashboard() {
    return success(await this.reportsService.getDashboardMetrics());
  }

  @Get('sales')
  @ApiOperation({ summary: 'Reporte de ventas por rango de fechas' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31' })
  async sales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return success(await this.reportsService.getSalesReport(startDate, endDate));
  }

  @Get('payments')
  @ApiOperation({ summary: 'Reporte de pagos agrupados por estado y método' })
  async payments() {
    return success(await this.reportsService.getPaymentsReport());
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Reporte de reembolsos' })
  async refunds() {
    return success(await this.reportsService.getRefundsReport());
  }
}
