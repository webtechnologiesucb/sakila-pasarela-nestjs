import { IsNumber, IsString, IsPositive, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRefundDto {
  @ApiProperty({ example: 2.99, description: 'Importe a reembolsar' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Cliente solicita cancelación', description: 'Motivo del reembolso' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
