import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { success } from '../common/dto/response.dto';
import { UserRole } from '@prisma/client';

@ApiTags('refunds')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post(':id/refunds')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Solicitar reembolso (parcial o total)',
    description: '⚠️ DEMO: Solo aplica a transacciones SUCCEEDED. No procesa dinero real.',
  })
  async createRefund(
    @Param('id') transactionId: string,
    @Body() dto: CreateRefundDto,
  ) {
    const refund = await this.refundsService.createRefund(transactionId, dto);
    return success(refund, `Reembolso ${refund.status === 'SUCCEEDED' ? 'aprobado' : 'procesado'}`);
  }

  @Get(':id/refunds')
  @ApiOperation({ summary: 'Listar reembolsos de una transacción' })
  async findRefunds(@Param('id') transactionId: string) {
    const refunds = await this.refundsService.findRefundsByTransaction(transactionId);
    return success(refunds);
  }
}
