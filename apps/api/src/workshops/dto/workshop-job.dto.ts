import { IsString, IsNumber, IsOptional, IsIn, Min, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const VALID_STATES = ['INGRESANDO', 'CHECK_INICIAL', 'TRABAJANDO', 'TERMINADO', 'SALIDA', 'FINALIZADO'];

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
  imagenesTerminado?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firmaDigital?: string;
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
}
