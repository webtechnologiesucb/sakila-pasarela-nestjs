import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserQueryDto } from '../common/dto/filter.dto';
import { success } from '../common/dto/response.dto';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios administrativos (solo ADMIN)' })
  async findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(
      query.page,
      query.limit,
      query.search,
      query.role,
      query.isActive === undefined ? undefined : query.isActive === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id') id: string) {
    return success(await this.usersService.findOne(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario administrativo' })
  async create(@Body() dto: CreateUserDto) {
    return success(
      await this.usersService.create(dto),
      'Usuario creado exitosamente',
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario, rol o contraseña' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return success(
      await this.usersService.update(id, dto, actorId),
      'Usuario actualizado exitosamente',
    );
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return success(
      await this.usersService.deactivate(id, actorId),
      'Usuario desactivado',
    );
  }
}
