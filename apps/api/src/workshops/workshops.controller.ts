import { Controller, Get, Put, Patch, Post, Delete, Param, Query, Body, UseGuards, Req, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { WorkshopsService } from './workshops.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CreateWorkshopServiceDto, UpdateWorkshopServiceDto } from './dto/workshop-service.dto';
import {
  CreateWorkshopJobDto, UpdateWorkshopJobDto, UpdateJobStatusDto,
  BulkUpdateCheckpointsDto, CreatePartNeedDto,
} from './dto/workshop-job.dto';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory.dto';
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

  // ─── CRM Jobs ───

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

  // ─── Checkpoints ───

  @Get('me/jobs/:id/checkpoints')
  @ApiOperation({ summary: 'Obtener checkpoints del check inicial' })
  getCheckpoints(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findCheckpoints(req.user.workshopId, id);
  }

  @Put('me/jobs/:id/checkpoints')
  @ApiOperation({ summary: 'Actualizar checkpoints del check inicial' })
  updateCheckpoints(@Req() req: any, @Param('id') id: string, @Body() dto: BulkUpdateCheckpointsDto) {
    return this.workshopsService.bulkUpdateCheckpoints(req.user.workshopId, id, dto);
  }

  // ─── Part Needs ───

  @Get('me/jobs/:id/parts-needed')
  @ApiOperation({ summary: 'Piezas/insumos necesarios' })
  getPartNeeds(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findPartNeeds(req.user.workshopId, id);
  }

  @Post('me/jobs/:id/parts-needed')
  @ApiOperation({ summary: 'Agregar pieza/insumo necesario' })
  createPartNeed(@Req() req: any, @Param('id') id: string, @Body() dto: CreatePartNeedDto) {
    return this.workshopsService.createPartNeed(req.user.workshopId, id, dto);
  }

  @Delete('me/jobs/:id/parts-needed/:pnId')
  @ApiOperation({ summary: 'Quitar pieza/insumo' })
  removePartNeed(@Req() req: any, @Param('id') id: string, @Param('pnId') pnId: string) {
    return this.workshopsService.removePartNeed(req.user.workshopId, id, pnId);
  }

  @Patch('me/jobs/:id/parts-needed/:pnId/use')
  @ApiOperation({ summary: 'Usar pieza/insumo y descontar del inventario' })
  usePartNeed(@Req() req: any, @Param('id') id: string, @Param('pnId') pnId: string) {
    return this.workshopsService.usePartNeed(req.user.workshopId, id, pnId);
  }

  // ─── Inventory ───

  @Get('me/inventory')
  @ApiOperation({ summary: 'Listar inventario del taller' })
  listInventory(@Req() req: any, @Query('categoria') categoria?: string) {
    return this.workshopsService.findInventory(req.user.workshopId, categoria);
  }

  @Post('me/inventory')
  @ApiOperation({ summary: 'Crear item de inventario' })
  createInventory(@Req() req: any, @Body() dto: CreateInventoryItemDto) {
    return this.workshopsService.createInventoryItem(req.user.workshopId, dto);
  }

  @Put('me/inventory/:id')
  @ApiOperation({ summary: 'Actualizar item de inventario' })
  updateInventory(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.workshopsService.updateInventoryItem(req.user.workshopId, id, dto);
  }

  @Delete('me/inventory/:id')
  @ApiOperation({ summary: 'Eliminar item de inventario' })
  removeInventory(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.removeInventoryItem(req.user.workshopId, id);
  }

  // ─── Upload & PDF ───

  @Post('me/jobs/:id/images')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/workshop-images',
      filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        cb(new Error('Solo se permiten imágenes'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de vehículo' })
  uploadImage(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.workshopsService.uploadJobImage(req.user.workshopId, id, file);
  }

  @Get('me/jobs/:id/pdf')
  @ApiOperation({ summary: 'Generar PDF del reporte' })
  async downloadPdf(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.workshopsService.generateJobPdf(req.user.workshopId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-taller-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  // ─── Otros ───

  @Get('nearby')
  @ApiOperation({ summary: 'Talleres cercanos' })
  findNearby(@Query('lat') lat: string, @Query('lng') lng: string, @Query('radius') radius?: string) {
    return this.workshopsService.findNearby(+lat, +lng, radius ? +radius : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener taller por ID' })
  findOne(@Param('id') id: string) { return this.workshopsService.findOne(id); }
}
