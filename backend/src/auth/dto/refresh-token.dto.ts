import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token entregado por POST /auth/login' })
  @IsString()
  @MinLength(20)
  refresh_token: string;
}
