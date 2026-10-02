import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestCategory } from '../../common/enums';

export class CreateRequestDto {
  @ApiProperty({
    example: 'Necesito una bomba de gasolina para una Hilux 2019',
  })
  @IsString()
  descripcion: string;

  @ApiProperty({ example: 'clxxx...', required: false })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ enum: RequestCategory, required: false })
  @IsOptional()
  @IsEnum(RequestCategory)
  categoria?: RequestCategory;

  @ApiProperty({
    required: false,
    description: 'Fecha/hora en que el cliente desea ingresar su vehículo (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  fechaCita?: string;

  @ApiProperty({
    required: false,
    description:
      'Taller de confianza: si se envía, la solicitud solo es visible para ese taller y debe incluir fechaCita con un slot libre',
    example: 'clxxx...',
  })
  @IsOptional()
  @IsString()
  workshopId?: string;
}
