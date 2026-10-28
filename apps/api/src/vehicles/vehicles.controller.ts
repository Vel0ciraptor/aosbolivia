import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ExcelImportService } from '../workshops/excel-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private vehiclesService: VehiclesService,
    private excelImportService: ExcelImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar vehículo' })
  create(@Req() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis vehículos' })
  findAll(@Req() req: any) {
    return this.vehiclesService.findAllByUser(req.user.id);
  }

  // ── Importación masiva de flota por Excel (empresas con varios vehículos) ──

  @Get('excel-template')
  @ApiOperation({ summary: 'Descargar plantilla Excel para importar la flota' })
  downloadTemplate(@Res() res: any) {
    const buffer = this.excelImportService.generateVehiclesTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_vehiculos.xlsx"',
    );
    res.end(buffer);
  }

  @Post('excel-preview')
  @ApiOperation({ summary: 'Previsualizar y validar archivo Excel de flota' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  previewExcel(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo no subido');
    return this.excelImportService.previewVehicles(req.user.id, file.buffer);
  }

  @Post('excel-confirm')
  @ApiOperation({ summary: 'Confirmar e importar masivamente la flota desde Excel' })
  confirmExcel(@Req() req: any, @Body() body: { vehicles: any[] }) {
    return this.excelImportService.confirmVehicles(req.user.id, body.vehicles || []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo por ID' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.vehiclesService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.vehiclesService.remove(id, req.user.id);
  }
}
