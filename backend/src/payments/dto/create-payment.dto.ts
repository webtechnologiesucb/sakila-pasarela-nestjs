import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ example: 'order-001', description: 'ID de la orden a pagar' })
  @IsString()
  order_id: string;

  @ApiProperty({ example: 5.98, description: 'Importe exacto de la orden' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'pm-card-001', description: 'ID del método de pago' })
  @IsString()
  payment_method_id: string;

  @ApiPropertyOptional({
    example: '71234567',
    description:
      'Identificador del pagador. Obligatorio para Tigo Money y Entel Money: 8 dígitos que inicien con 6 o 7, con +591 opcional. Se almacena enmascarado.',
  })
  @IsOptional()
  @IsString()
  payer_identifier?: string;

  @ApiPropertyOptional({
    example: 'tok_demo_approved_4242',
    description: 'Token de prueba ficticio. Opciones: tok_demo_approved_4242 | tok_demo_insufficient_9999 | tok_demo_invalid_0000 | tok_demo_error_5678',
  })
  @IsOptional()
  @IsString()
  test_token?: string;
}
