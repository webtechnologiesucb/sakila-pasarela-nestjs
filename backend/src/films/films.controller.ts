import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilmsService } from './films.service';
import { FilmQueryDto } from '../common/dto/filter.dto';
import { success } from '../common/dto/response.dto';

@ApiTags('films')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar películas del catálogo con paginación' })
  async findAll(@Query() query: FilmQueryDto) {
    return this.filmsService.findAll(
      query.page,
      query.limit,
      query.search,
      query.categoryId,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías de películas' })
  async findCategories() {
    const categories = await this.filmsService.findCategories();
    return success(categories);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una película' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const film = await this.filmsService.findOne(id);
    return success(film);
  }
}
