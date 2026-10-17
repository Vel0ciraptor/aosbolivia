import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const VALID_STATES = [
  'INGRESANDO',
  'CHECK_INICIAL',
  'TRABAJANDO',
  'TERMINADO',
  'SALIDA',
  'FINALIZADO',
];

export class CreateWorkshopJobDto {
  @ApiProperty()
  @IsString()
  marca: string;

  @ApiProperty()
  @IsString()
  modelo: string;

  @ApiProperty()
  @IsNumber()
  @Min(1900)
  anio: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kilometraje?: number;

  @ApiProperty()
  @IsString()
  problema: string;

  @ApiProperty()
  @IsString()
  clienteNombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteTelefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ required: false, enum: ['DIRECTO', 'COTIZACION'] })
  @IsOptional()
  @IsIn(['DIRECTO', 'COTIZACION'])
  origen?: string;
}

export class UpdateWorkshopJobDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  anio?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kilometraje?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  problema?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteTelefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  imagenes?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  imagenesIngreso?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  imagenesTerminado?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firmaDigital?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firmaIngreso?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  tipoTrabajo?: { categorias?: string[]; otro?: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  horasEstimadas?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  mecanicosAsignados?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioServicio?: number;

  @ApiProperty({ required: false, enum: ['DIRECTO', 'COTIZACION'] })
  @IsOptional()
  @IsIn(['DIRECTO', 'COTIZACION'])
  origen?: string;

  @ApiProperty({
    required: false,
    description: 'Trabajos realizados con precio individual',
  })
  @IsOptional()
  @IsArray()
  serviciosRealizados?: { id?: string; nombre: string; precio: number }[];

  @ApiProperty({ required: false, enum: ['EMPTY', '1/4', '1/2', '3/4', 'FULL'] })
  @IsOptional()
  @IsString()
  nivelCombustible?: string;

  @ApiProperty({ required: false, description: 'Foto del tablero/odómetro como evidencia' })
  @IsOptional()
  @IsString()
  fotoTablero?: string;

  @ApiProperty({ required: false, description: 'Diagnóstico mecánico inicial' })
  @IsOptional()
  @IsString()
  diagnosticoMecanico?: string;

  @ApiProperty({ required: false, description: 'Fotos del diagnóstico' })
  @IsOptional()
  @IsArray()
  diagnosticoImagenes?: string[];

  @ApiProperty({ required: false, description: 'Conclusiones de observaciones en la entrega' })
  @IsOptional()
  @IsString()
  conclusionesEntrega?: string;

  @ApiProperty({ required: false, enum: ['PORCENTAJE', 'FIJO'] })
  @IsOptional()
  @IsString()
  descuentoTipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuentoValor?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  aplicaIva?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  porcentajeIva?: number;
}


export class UpdateJobStatusDto {
  @ApiProperty({ enum: VALID_STATES })
  @IsString()
  @IsIn(VALID_STATES)
  estado: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class UpdateCheckpointDto {
  @ApiProperty()
  @IsBoolean()
  checked: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CheckpointItemDto {
  @ApiProperty()
  @IsString()
  servicio: string;

  @ApiProperty()
  @IsBoolean()
  checked: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}

export class BulkUpdateCheckpointsDto {
  @ApiProperty({ type: [CheckpointItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckpointItemDto)
  checkpoints: CheckpointItemDto[];
}

export class CreatePartNeedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  cantidad: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  esInsumo: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
}

export class UpdatePartNeedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
}

export class StartStopWorkDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateWorklogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  horasReales?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fin?: string;
}

export class AddWorkTagDto {
  @ApiProperty({ description: 'Nombre del tag de tipo de trabajo' })
  @IsString()
  nombre: string;
}

export class UpdateCostDto {
  @ApiProperty({ description: 'Nuevo precio asignado' })
  @IsNumber()
  @Min(0)
  nuevoPrecio: number;

  @ApiProperty({ description: 'Justificación obligatoria de la modificación' })
  @IsString()
  justificacion: string;
}

export class CreateMaterialRequestDto {
  @ApiProperty({ description: 'ID del item de inventario' })
  @IsString()
  inventoryItemId: string;

  @ApiProperty({ description: 'Cantidad solicitada', default: 1 })
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiProperty({ required: false, description: 'ID del servicio relacionado' })
  @IsOptional()
  @IsString()
  servicioId?: string;

  @ApiProperty({ required: false, description: 'Motivo o justificación' })
  @IsOptional()
  @IsString()
  justificacion?: string;
}

export class ApproveMaterialRequestDto {
  @ApiProperty({ enum: ['APROBAR', 'RECHAZAR'] })
  @IsString()
  @IsIn(['APROBAR', 'RECHAZAR'])
  accion: 'APROBAR' | 'RECHAZAR';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class DeliverMaterialRequestDto {
  @ApiProperty({ description: 'Cantidad entregada físicamente' })
  @IsNumber()
  @Min(1)
  cantidadEntregada: number;
}

export class CustomerApprovalDecisionDto {
  @ApiProperty({ enum: ['APROBAR', 'RECHAZAR'] })
  @IsString()
  @IsIn(['APROBAR', 'RECHAZAR'])
  decision: 'APROBAR' | 'RECHAZAR';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({ required: false, description: 'Firma digital en Base64' })
  @IsOptional()
  @IsString()
  firma?: string;
}

export class SendApprovalWhatsAppDto {
  @ApiProperty({ required: false, description: 'URL base de la aplicación para el enlace' })
  @IsOptional()
  @IsString()
  appUrl?: string;
}

