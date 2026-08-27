import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ enum: ['REPUESTO', 'INSUMO'] })
  @IsString()
  categoria: string;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @ApiProperty({ default: 'unidad' })
  @IsString()
  unidad: string;
}

export class UpdateInventoryItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unidad?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  estado?: string;
}
