import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Headers, BadRequestException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from '../common/dto/filter.dto';
import { success } from '../common/dto/response.dto';
import { UserRole } from '@prisma/client';

@ApiTags('payments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({
    summary: 'Procesar pago simulado',
    description: '⚠️ DEMO: No procesa dinero real. Requiere header X-Idempotency-Key.',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Clave única para garantizar idempotencia. Use UUID v4.',
    required: true,
  })
  async processPayment(
    @Body() dto: CreatePaymentDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
      throw new BadRequestException(
        'Se requiere header X-Idempotency-Key con al menos 8 caracteres',
      );
    }

    const result = await this.paymentsService.processPayment(dto, idempotencyKey.trim());
    return success(result, `Pago ${result.status === 'SUCCEEDED' ? 'aprobado' : 'procesado'}`);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Listar métodos de pago simulados activos' })
  async findMethods() {
    return success(await this.paymentsService.findMethods());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de transacción' })
  async findOne(@Param('id') id: string) {
    const txn = await this.paymentsService.findOne(id);
    return success(txn);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Consultar estado de transacción' })
  async findStatus(@Param('id') id: string) {
    const status = await this.paymentsService.findStatus(id);
    return success(status);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las transacciones' })
  async findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(
      query.page,
      query.limit,
      query.status,
      query.orderId,
    );
  }
}
