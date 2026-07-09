import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { CreatePartDto, UpdatePartDto } from './dto/parts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parts')
export class PartsController {
  constructor(private partsService: PartsService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar repuestos' })
  @ApiQuery({ name: 'marca', required: false })
  @ApiQuery({ name: 'modelo', required: false })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query() query: { marca?: string; modelo?: string; anio?: string; search?: string }) {
    return this.partsService.findAll({
      ...query,
      anio: query.anio ? parseInt(query.anio) : undefined,
    });
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Repuestos de un proveedor' })
  findByProvider(@Param('providerId') providerId: string) {
    return this.partsService.findByProvider(providerId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear repuesto en el catálogo del proveedor autenticado' })
  create(@Req() req: any, @Body() dto: CreatePartDto) {
    return this.partsService.create(req.user.providerId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar repuesto propio' })
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdatePartDto) {
    return this.partsService.update(id, req.user.providerId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (desactivar) repuesto propio' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.partsService.remove(id, req.user.providerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener repuesto por ID' })
  findOne(@Param('id') id: string) {
    return this.partsService.findOne(id);
  }
}
