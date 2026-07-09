import { Controller, Post, Get, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear solicitud inteligente (el texto es parseado por IA)' })
  create(@Req() req: any, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis solicitudes' })
  findAll(@Req() req: any) {
    return this.requestsService.findAllByUser(req.user.id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Listar todas las solicitudes (Admin/Proveedor/Taller/Grúa)' })
  findAllAdmin() {
    return this.requestsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener solicitud con cotizaciones y mensajes' })
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de la solicitud' })
  updateStatus(@Param('id') id: string, @Body() body: { estado: string }) {
    return this.requestsService.updateStatus(id, body.estado);
  }
}
