import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from '../common/dto/filter.dto';
import { success } from '../common/dto/response.dto';
import { UserRole } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Crear nueva orden de compra' })
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(dto);
    return success(order, 'Orden creada exitosamente');
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes con paginación' })
  async findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(
      query.page,
      query.limit,
      query.customerId,
      query.status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una orden' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return success(order);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cancelar una orden pendiente' })
  async cancel(@Param('id') id: string) {
    const order = await this.ordersService.cancel(id);
    return success(order, 'Orden cancelada');
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Obtener pagos de una orden' })
  async findOrderPayments(@Param('id') id: string) {
    const payments = await this.ordersService.findOrderPayments(id);
    return success(payments);
  }
}
