import { Controller, Get, Put, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TowsService } from './tows.service';
import { UpdateTowDto } from './dto/update-tow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tows')
export class TowsController {
  constructor(private towsService: TowsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar servicios de grúa' })
  findAll() { return this.towsService.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del servicio de grúa autenticado' })
  findMe(@Req() req: any) {
    return this.towsService.findByUserId(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del servicio de grúa autenticado' })
  updateMe(@Req() req: any, @Body() dto: UpdateTowDto) {
    return this.towsService.update(req.user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Grúas cercanas con costo estimado' })
  findNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.towsService.findNearby(+lat, +lng, radius ? +radius : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener grúa por ID' })
  findOne(@Param('id') id: string) { return this.towsService.findOne(id); }
}
