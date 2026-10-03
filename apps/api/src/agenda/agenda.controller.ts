import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  AgendaService,
  CreateAvailabilityDto,
  CopyAvailabilityDto,
  ApplyWeeklyDto,
} from './agenda.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Agenda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workshops')
export class AgendaController {
  constructor(private agendaService: AgendaService) {}

  @Get('me/availability')
  @ApiOperation({ summary: 'Bloques de agenda del taller' })
  findAvailability(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendaService.findAvailability(req.user.workshopId, from, to);
  }

  @Post('me/availability')
  @ApiOperation({ summary: 'Crear bloque de horario' })
  createBlock(@Req() req: any, @Body() dto: CreateAvailabilityDto) {
    return this.agendaService.createBlock(req.user.workshopId, dto);
  }

  @Post('me/availability/copy')
  @ApiOperation({
    summary: 'Copiar los bloques de un d��a modelo a un rango de fechas',
  })
  copyBlocks(@Req() req: any, @Body() dto: CopyAvailabilityDto) {
    return this.agendaService.copyBlocks(req.user.workshopId, dto);
  }

  @Post('me/availability/weekly')
  @ApiOperation({
    summary: 'Guardar el horario habitual (días + rangos) y generar la agenda',
  })
  applyWeekly(@Req() req: any, @Body() dto: ApplyWeeklyDto) {
    return this.agendaService.applyWeeklyPattern(req.user.workshopId, dto);
  }

  @Delete('me/availability/:id')
  @ApiOperation({ summary: 'Eliminar bloque de horario' })
  removeBlock(@Req() req: any, @Param('id') id: string) {
    return this.agendaService.removeBlock(req.user.workshopId, id);
  }

  @Get('me/appointments')
  @ApiOperation({ summary: 'Citas reservadas del taller' })
  findAppointments(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendaService.findAppointments(req.user.workshopId, from, to);
  }

  @Delete('me/appointments/:id')
  @ApiOperation({ summary: 'Cancelar una cita' })
  cancelAppointment(@Req() req: any, @Param('id') id: string) {
    return this.agendaService.cancelAppointment(req.user.workshopId, id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'Slots disponibles de un taller (para el cliente)' })
  getSlots(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.agendaService.getSlots(id, from, to);
  }
}
