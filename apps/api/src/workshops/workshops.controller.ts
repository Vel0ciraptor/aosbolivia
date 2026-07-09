import { Controller, Get, Put, Patch, Post, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateWorkshopServiceDto, UpdateWorkshopServiceDto } from './dto/workshop-service.dto';
import { CreateWorkshopJobDto, UpdateWorkshopJobDto, UpdateJobStatusDto } from './dto/workshop-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Workshops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private workshopsService: WorkshopsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar talleres' })
  findAll() { return this.workshopsService.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del taller autenticado' })
  findMe(@Req() req: any) {
    return this.workshopsService.findByUserId(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del taller autenticado' })
  updateMe(@Req() req: any, @Body() dto: UpdateWorkshopDto) {
    return this.workshopsService.update(req.user.id, dto);
  }

  @Get('me/services')
  @ApiOperation({ summary: 'Listar servicios del taller autenticado' })
  listMyServices(@Req() req: any) {
    return this.workshopsService.findServices(req.user.workshopId);
  }

  @Post('me/services')
  @ApiOperation({ summary: 'Crear servicio en el taller autenticado' })
  createMyService(@Req() req: any, @Body() dto: CreateWorkshopServiceDto) {
    return this.workshopsService.createService(req.user.workshopId, dto);
  }

  @Put('me/services/:id')
  @ApiOperation({ summary: 'Actualizar servicio propio del taller' })
  updateMyService(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWorkshopServiceDto) {
    return this.workshopsService.updateService(req.user.workshopId, id, dto);
  }

  @Delete('me/services/:id')
  @ApiOperation({ summary: 'Eliminar servicio propio del taller' })
  removeMyService(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.removeService(req.user.workshopId, id);
  }

  @Get('me/jobs')
  @ApiOperation({ summary: 'Listar vehículos en CRM del taller' })
  listMyJobs(@Req() req: any, @Query('estado') estado?: string) {
    return this.workshopsService.findJobs(req.user.workshopId, estado);
  }

  @Get('me/jobs/:id')
  @ApiOperation({ summary: 'Obtener vehículo del CRM' })
  getMyJob(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findJobById(req.user.workshopId, id);
  }

  @Post('me/jobs')
  @ApiOperation({ summary: 'Registrar vehículo en CRM' })
  createMyJob(@Req() req: any, @Body() dto: CreateWorkshopJobDto) {
    return this.workshopsService.createJob(req.user.workshopId, dto);
  }

  @Post('me/jobs/from-request/:requestId')
  @ApiOperation({ summary: 'Crear registro CRM desde solicitud' })
  createMyJobFromRequest(@Req() req: any, @Param('requestId') requestId: string) {
    return this.workshopsService.createJobFromRequest(req.user.workshopId, requestId);
  }

  @Put('me/jobs/:id')
  @ApiOperation({ summary: 'Actualizar vehículo en CRM' })
  updateMyJob(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWorkshopJobDto) {
    return this.workshopsService.updateJob(req.user.workshopId, id, dto);
  }

  @Patch('me/jobs/:id/status')
  @ApiOperation({ summary: 'Cambiar estado del vehículo en CRM' })
  updateMyJobStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.workshopsService.updateJobStatus(req.user.workshopId, id, dto);
  }

  @Delete('me/jobs/:id')
  @ApiOperation({ summary: 'Eliminar vehículo del CRM' })
  removeMyJob(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.removeJob(req.user.workshopId, id);
  }

  @Get('me/jobs/:id/logs')
  @ApiOperation({ summary: 'Historial de estados del vehículo' })
  getMyJobLogs(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findJobLogs(req.user.workshopId, id);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Talleres cercanos' })
  findNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.workshopsService.findNearby(+lat, +lng, radius ? +radius : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener taller por ID' })
  findOne(@Param('id') id: string) { return this.workshopsService.findOne(id); }
}
