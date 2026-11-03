import { IsString, IsEmail, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(1)
  @MaxLength(45)
  first_name: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  @MinLength(1)
  @MaxLength(45)
  last_name: string;

  @ApiPropertyOptional({ example: 'juan.garcia@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de tienda (1 o 2)' })
  @IsOptional()
  @IsInt()
  store_id?: number;

  @ApiPropertyOptional({ example: 5, description: 'ID de dirección existente' })
  @IsOptional()
  @IsInt()
  address_id?: number;
}
