import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditQueryDto } from '../common/dto/filter.dto';
import { success } from '../common/dto/response.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoría (solo ADMIN)' })
  async findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll({
      page: query.page,
      limit: query.limit,
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      from: query.from,
      to: query.to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de auditoría por ID' })
  async findOne(@Param('id') id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Registro de auditoría ${id} no encontrado`);
    }
    return success(log);
  }
}
