import { Controller, Get, Param, Query, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private providersService: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los proveedores' })
  findAll() { return this.providersService.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del proveedor autenticado' })
  async findMe(@Req() req: any) {
    return this.providersService.findByUserId(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del proveedor autenticado' })
  updateMe(@Req() req: any, @Body() dto: UpdateProviderDto) {
    return this.providersService.update(req.user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Proveedores cercanos por geolocalización' })
  findNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.providersService.findNearby(+lat, +lng, radius ? +radius : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor con catálogo' })
  findOne(@Param('id') id: string) { return this.providersService.findOne(id); }
}
