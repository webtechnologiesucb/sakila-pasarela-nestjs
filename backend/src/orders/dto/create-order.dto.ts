import { IsInt, IsString, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 1, description: 'ID de la película' })
  @IsInt()
  @Min(1)
  film_id: number;

  @ApiProperty({ example: 1, description: 'Cantidad (1-10)' })
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: 'ID del cliente' })
  @IsInt()
  @Min(1)
  customer_id: number;

  @ApiProperty({ type: [OrderItemDto], description: 'Productos de la orden (mínimo 1)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ example: 'Pedido de demostración' })
  @IsOptional()
  @IsString()
  notes?: string;
}
