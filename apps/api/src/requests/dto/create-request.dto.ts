import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RequestCategory } from '../../common/enums';

export class CreateRequestDto {
  @ApiProperty({ example: 'Necesito una bomba de gasolina para una Hilux 2019' })
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
}
