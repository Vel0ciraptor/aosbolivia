import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_STATES = ['INGRESANDO', 'CHECK_INICIAL', 'TRABAJANDO', 'TERMINADO', 'SALIDA'];

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
