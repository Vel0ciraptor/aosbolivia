import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { WorkshopsService } from './workshops.service';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import {
  CreateWorkshopServiceDto,
  UpdateWorkshopServiceDto,
} from './dto/workshop-service.dto';
import {
  CreateWorkshopJobDto,
  UpdateWorkshopJobDto,
  UpdateJobStatusDto,
  BulkUpdateCheckpointsDto,
  CreatePartNeedDto,
  UpdatePartNeedDto,
  StartStopWorkDto,
  UpdateWorklogDto,
  AddWorkTagDto,
  UpdateCostDto,
  CreateMaterialRequestDto,
  ApproveMaterialRequestDto,
  DeliverMaterialRequestDto,
  SendApprovalWhatsAppDto,
} from './dto/workshop-job.dto';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import {
  CreateWorkshopUserDto,
  UpdateWorkshopUserDto,
  ResetWorkshopUserPasswordDto,
  ChangeOwnPasswordDto,
} from './dto/workshop-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Workshops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private workshopsService: WorkshopsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar talleres' })
  findAll() {
    return this.workshopsService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del taller autenticado' })
  findMe(@Req() req: any) {
    if (req.user.role === 'WORKSHOP_USER') {
      return this.workshopsService.findByWorkshopId(req.user.workshopId);
    }
    return this.workshopsService.findByUserId(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del taller autenticado' })
  updateMe(@Req() req: any, @Body() dto: UpdateWorkshopDto) {
    return this.workshopsService.update(req.user.id, dto);
  }

  @Post('me/work-tags')
  @ApiOperation({ summary: 'Guardar un tag personalizado de tipo de trabajo' })
  addWorkTag(@Req() req: any, @Body() dto: AddWorkTagDto) {
    return this.workshopsService.addWorkTag(req.user.workshopId, dto.nombre);
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
  updateMyService(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkshopServiceDto,
  ) {
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
    return this.workshopsService.findJobs(
      req.user.workshopId,
      estado,
      req.user.workshopUserRole,
      req.user.id,
    );
  }

  @Get('me/jobs/:id')
  @ApiOperation({ summary: 'Obtener vehículo del CRM' })
  getMyJob(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findJobById(
      req.user.workshopId,
      id,
      req.user.workshopUserRole,
      req.user.id,
    );
  }

  @Post('me/jobs')
  @ApiOperation({ summary: 'Registrar vehículo en CRM' })
  createMyJob(@Req() req: any, @Body() dto: CreateWorkshopJobDto) {
    return this.workshopsService.createJob(req.user.workshopId, dto);
  }

  @Post('me/jobs/from-request/:requestId')
  @ApiOperation({ summary: 'Crear registro CRM desde solicitud' })
  createMyJobFromRequest(
    @Req() req: any,
    @Param('requestId') requestId: string,
  ) {
    return this.workshopsService.createJobFromRequest(
      req.user.workshopId,
      requestId,
    );
  }

  @Put('me/jobs/:id')
  @ApiOperation({ summary: 'Actualizar vehículo en CRM' })
  updateMyJob(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkshopJobDto,
  ) {
    return this.workshopsService.updateJob(req.user.workshopId, id, dto, {
      id: req.user.id,
      name: req.user.name,
    });
  }

  @Patch('me/jobs/:id/status')
  @ApiOperation({ summary: 'Cambiar estado del vehículo en CRM' })
  updateMyJobStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.workshopsService.updateJobStatus(req.user.workshopId, id, dto, {
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.workshopUserRole || req.user.role,
      userType: req.user.role,
    });
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
  updateCheckpoints(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BulkUpdateCheckpointsDto,
  ) {
    return this.workshopsService.bulkUpdateCheckpoints(
      req.user.workshopId,
      id,
      dto,
    );
  }

  // ─── Part Needs ───

  @Get('me/jobs/:id/parts-needed')
  @ApiOperation({ summary: 'Piezas/insumos necesarios' })
  getPartNeeds(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.findPartNeeds(req.user.workshopId, id);
  }

  @Post('me/jobs/:id/parts-needed')
  @ApiOperation({ summary: 'Agregar pieza/insumo necesario' })
  createPartNeed(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreatePartNeedDto,
  ) {
    return this.workshopsService.createPartNeed(
      req.user.workshopId,
      id,
      dto,
      req.user.workshopUserRole,
    );
  }

  @Delete('me/jobs/:id/parts-needed/:pnId')
  @ApiOperation({ summary: 'Quitar pieza/insumo' })
  removePartNeed(
    @Req() req: any,
    @Param('id') id: string,
    @Param('pnId') pnId: string,
  ) {
    return this.workshopsService.removePartNeed(req.user.workshopId, id, pnId);
  }

  @Patch('me/jobs/:id/parts-needed/:pnId')
  @ApiOperation({ summary: 'Editar pieza/insumo (nombre, cantidad, precio)' })
  updatePartNeed(
    @Req() req: any,
    @Param('id') id: string,
    @Param('pnId') pnId: string,
    @Body() dto: UpdatePartNeedDto,
  ) {
    return this.workshopsService.updatePartNeed(
      req.user.workshopId,
      id,
      pnId,
      dto,
      req.user.workshopUserRole,
    );
  }

  @Patch('me/jobs/:id/parts-needed/:pnId/use')
  @ApiOperation({ summary: 'Usar pieza/insumo y descontar del inventario' })
  usePartNeed(
    @Req() req: any,
    @Param('id') id: string,
    @Param('pnId') pnId: string,
  ) {
    return this.workshopsService.usePartNeed(req.user.workshopId, id, pnId, {
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.workshopUserRole,
    });
  }

  // ─── Worklogs (Horas de mecánicos) ───

  @Post('me/jobs/:id/work/start')
  @ApiOperation({ summary: 'Iniciar trabajo de un mecánico' })
  startWork(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: StartStopWorkDto,
  ) {
    return this.workshopsService.startWork(req.user.workshopId, id, dto, {
      id: req.user.id,
      name: req.user.name,
      role: req.user.workshopUserRole,
    });
  }

  @Post('me/jobs/:id/work/stop')
  @ApiOperation({ summary: 'Terminar trabajo de un mecánico' })
  stopWork(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: StartStopWorkDto,
  ) {
    return this.workshopsService.stopWork(req.user.workshopId, id, dto, {
      id: req.user.id,
      role: req.user.workshopUserRole,
    });
  }

  @Patch('me/jobs/:id/worklogs/:worklogId')
  @ApiOperation({ summary: 'Editar horas manualmente (admin)' })
  updateWorklog(
    @Req() req: any,
    @Param('id') id: string,
    @Param('worklogId') worklogId: string,
    @Body() dto: UpdateWorklogDto,
  ) {
    return this.workshopsService.updateWorklog(
      req.user.workshopId,
      id,
      worklogId,
      dto,
      req.user.workshopUserRole,
    );
  }

  // ─── Historial (Horas + Movimientos de inventario) ───

  @Get('me/mechanic-hours')
  @ApiOperation({ summary: 'Horas de mecánicos (historial)' })
  getMechanicHours(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.workshopsService.getMechanicHours(
      req.user.workshopId,
      from,
      to,
    );
  }

  @Get('me/inventory-movements')
  @ApiOperation({
    summary: 'Movimientos de inventario (salidas de piezas por job)',
  })
  getInventoryMovements(@Req() req: any) {
    return this.workshopsService.getInventoryMovements(req.user.workshopId);
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
  updateInventory(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.workshopsService.updateInventoryItem(
      req.user.workshopId,
      id,
      dto,
    );
  }

  @Delete('me/inventory/:id')
  @ApiOperation({ summary: 'Eliminar item de inventario' })
  removeInventory(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.removeInventoryItem(req.user.workshopId, id);
  }

  // ─── Workshop Users (Equipo interno) ───

  @Get('me/users')
  @ApiOperation({ summary: 'Listar equipo del taller' })
  listMyUsers(@Req() req: any) {
    return this.workshopsService.findWorkshopUsers(req.user.workshopId);
  }

  @Post('me/users')
  @ApiOperation({ summary: 'Crear miembro del equipo' })
  createMyUser(@Req() req: any, @Body() dto: CreateWorkshopUserDto) {
    return this.workshopsService.createWorkshopUser(req.user.workshopId, dto);
  }

  @Put('me/users/:id')
  @ApiOperation({ summary: 'Actualizar miembro del equipo' })
  updateMyUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkshopUserDto,
  ) {
    return this.workshopsService.updateWorkshopUser(
      req.user.workshopId,
      id,
      dto,
    );
  }

  @Delete('me/users/:id')
  @ApiOperation({ summary: 'Desactivar miembro del equipo' })
  removeMyUser(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.removeWorkshopUser(req.user.workshopId, id);
  }

  @Post('me/users/:id/reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña de un miembro del equipo' })
  resetMyUserPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ResetWorkshopUserPasswordDto,
  ) {
    return this.workshopsService.resetWorkshopUserPassword(
      req.user.workshopId,
      id,
      dto,
    );
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Cambiar mi propia contraseña (miembro de equipo)' })
  changeMyPassword(@Req() req: any, @Body() dto: ChangeOwnPasswordDto) {
    if (req.user.role !== 'WORKSHOP_USER') {
      throw new BadRequestException(
        'Solo los miembros del equipo usan este endpoint',
      );
    }
    return this.workshopsService.changeOwnWorkshopUserPassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // ─── Upload & PDF ───

  @Post('me/jobs/:id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/workshop-images',
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de vehículo' })
  uploadImage(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPG, PNG, GIF o WebP',
      );
    }
    return this.workshopsService.uploadJobImage(req.user.workshopId, id, file);
  }

  @Get('me/jobs/:id/report')
  @ApiOperation({ summary: 'Generar reporte HTML del vehículo' })
  async downloadReport(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const html = await this.workshopsService.generateJobReport(
      req.user.workshopId,
      id,
      req.user.workshopUserRole,
    );
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  // ─── Logo del taller ───

  @Post('me/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (_req, file, cb) => {
          const uniqueName = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 300 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir logo del taller (máx 300x300 px y 300 KB)' })
  uploadLogo(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (req.user.role === 'WORKSHOP_USER') {
      throw new BadRequestException('Solo el dueño del taller puede cambiar el logo');
    }
    if (!file) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPG, PNG, GIF o WebP de máximo 300 KB',
      );
    }
    return this.workshopsService.uploadLogo(req.user.workshopId, file);
  }

  @Delete('me/logo')
  @ApiOperation({ summary: 'Eliminar logo del taller' })
  removeLogo(@Req() req: any) {
    if (req.user.role === 'WORKSHOP_USER') {
      throw new BadRequestException('Solo el dueño del taller puede cambiar el logo');
    }
    return this.workshopsService.removeLogo(req.user.workshopId);
  }

  // ─── WhatsApp y Autorización ───

  @Post('me/jobs/:id/whatsapp-approval')
  @ApiOperation({ summary: 'Generar y registrar enlace de WhatsApp para aprobación de diagnóstico' })
  sendApprovalWhatsApp(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendApprovalWhatsAppDto,
  ) {
    return this.workshopsService.sendDiagnosticApprovalWhatsApp(
      req.user.workshopId,
      id,
      req.user.id,
      dto,
    );
  }

  @Post('me/jobs/:id/whatsapp-ready')
  @ApiOperation({ summary: 'Enviar notificación por WhatsApp de vehículo terminado/listo' })
  sendReadyWhatsApp(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.sendVehicleReadyWhatsApp(
      req.user.workshopId,
      id,
      req.user.id,
    );
  }

  // ─── Edición de Costo con Auditoría ───

  @Patch('me/jobs/:id/cost')
  @ApiOperation({ summary: 'Modificar costo final del cliente con justificación y auditoría' })
  updateCost(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCostDto,
  ) {
    return this.workshopsService.updateJobCost(
      req.user.workshopId,
      id,
      {
        id: req.user.id,
        name: req.user.name,
        role: req.user.workshopUserRole || req.user.role,
      },
      dto,
    );
  }

  @Get('me/jobs/:id/cost-audits')
  @ApiOperation({ summary: 'Consultar historial de auditoría de modificaciones de precio' })
  getCostAudits(@Req() req: any, @Param('id') id: string) {
    return this.workshopsService.getJobCostAudits(req.user.workshopId, id);
  }

  // ─── Insumos y Salidas de Almacén ───

  @Post('me/jobs/:id/materials')
  @ApiOperation({ summary: 'Solicitar insumos o repuestos para una orden de trabajo' })
  requestMaterial(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateMaterialRequestDto,
  ) {
    return this.workshopsService.createMaterialRequest(
      req.user.workshopId,
      id,
      { id: req.user.id, name: req.user.name },
      dto,
    );
  }

  @Get('me/materials')
  @ApiOperation({ summary: 'Listar solicitudes de materiales del taller' })
  listMaterials(@Req() req: any, @Query('jobId') jobId?: string) {
    return this.workshopsService.listMaterialRequests(req.user.workshopId, jobId);
  }

  @Patch('me/materials/:id/approve')
  @ApiOperation({ summary: 'Aprobar o rechazar solicitud de material (Jefe Mecánico / Admin)' })
  approveMaterial(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveMaterialRequestDto,
  ) {
    return this.workshopsService.approveMaterialRequest(
      req.user.workshopId,
      id,
      {
        id: req.user.id,
        name: req.user.name,
        role: req.user.workshopUserRole || req.user.role,
      },
      dto,
    );
  }

  @Patch('me/materials/:id/deliver')
  @ApiOperation({ summary: 'Registrar entrega física de materiales desde almacén (descuenta stock)' })
  deliverMaterial(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DeliverMaterialRequestDto,
  ) {
    return this.workshopsService.deliverMaterialRequest(
      req.user.workshopId,
      id,
      {
        id: req.user.id,
        name: req.user.name,
        role: req.user.workshopUserRole || req.user.role,
      },
      dto,
    );
  }

  // ─── Insumos Predefinidos en Servicios ───

  @Post('me/jobs/:id/services/:serviceId/load-materials')
  @ApiOperation({ summary: 'Cargar insumos predefinidos de un servicio a la orden de trabajo' })
  loadSuggestedMaterials(
    @Req() req: any,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.workshopsService.addSuggestedMaterialsToJob(
      req.user.workshopId,
      id,
      serviceId,
      { id: req.user.id, name: req.user.name },
    );
  }

  // ─── Importación y Plantillas Excel ───

  @Get('me/inventory/template')
  @ApiOperation({ summary: 'Descargar plantilla oficial Excel para inventario' })
  downloadInventoryTemplate(@Res() res: Response) {
    const buffer = this.workshopsService.getInventoryTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_inventario.xlsx"',
    );
    res.end(buffer);
  }

  @Post('me/inventory/excel-preview')
  @ApiOperation({ summary: 'Previsualizar y validar archivo Excel de inventario' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  previewInventory(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo no subido');
    return this.workshopsService.previewInventoryImport(req.user.workshopId, file.buffer);
  }

  @Post('me/inventory/excel-confirm')
  @ApiOperation({ summary: 'Confirmar e importar masivamente el inventario desde Excel' })
  confirmInventory(@Req() req: any, @Body() body: { items: any[] }) {
    return this.workshopsService.confirmInventoryImport(
      req.user.workshopId,
      req.user.id,
      req.user.name || 'Usuario',
      body.items || [],
    );
  }

  @Get('me/services/template')
  @ApiOperation({ summary: 'Descargar plantilla oficial Excel para catálogo de servicios' })
  downloadServicesTemplate(@Res() res: Response) {
    const buffer = this.workshopsService.getServicesTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_servicios.xlsx"',
    );
    res.end(buffer);
  }

  @Post('me/services/excel-preview')
  @ApiOperation({ summary: 'Previsualizar y validar archivo Excel de servicios' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  previewServices(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo no subido');
    return this.workshopsService.previewServicesImport(req.user.workshopId, file.buffer);
  }

  @Post('me/services/excel-confirm')
  @ApiOperation({ summary: 'Confirmar e importar masivamente el catálogo de servicios desde Excel' })
  confirmServices(@Req() req: any, @Body() body: { services: any[] }) {
    return this.workshopsService.confirmServicesImport(
      req.user.workshopId,
      body.services || [],
    );
  }

  // ─── Tipo de Cambio ───

  @Get('me/exchange-rate')
  @ApiOperation({ summary: 'Obtener cotización actual del Dólar Blue Bolivia (valor de venta)' })
  getExchangeRate() {
    return this.workshopsService.getExchangeRate();
  }

  // ─── Otros ───

  @Get('nearby')
  @ApiOperation({ summary: 'Talleres cercanos' })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.workshopsService.findNearby(+lat, +lng, radius ? +radius : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener taller por ID' })
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }
}

