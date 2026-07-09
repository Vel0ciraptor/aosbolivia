import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  marca: string;

  @ApiProperty({ example: 'Hilux' })
  @IsString()
  modelo: string;

  @ApiProperty({ example: 2019 })
  @IsInt()
  @Min(1950)
  @Max(2030)
  @Type(() => Number)
  anio: number;

  @ApiProperty({ example: '2.8 TDI', required: false })
  @IsOptional()
  @IsString()
  motor?: string;

  @ApiProperty({ example: 'Diesel', required: false })
  @IsOptional()
  @IsString()
  combustible?: string;

  @ApiProperty({ example: 'ABC-123', required: false })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiProperty({ example: '1HGBH41JXMN109186', required: false })
  @IsOptional()
  @IsString()
  vin?: string;
}
