import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkshopDto {
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
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Objeto JSON con horario por día',
  })
  @IsOptional()
  @IsObject()
  horario?: Record<string, string>;

  @ApiProperty({
    required: false,
    description: 'Color de marca para el PDF (#RRGGBB)',
  })
  @IsOptional()
  @IsString()
  colorPrimario?: string;

  @ApiProperty({
    required: false,
    description: 'Tags personalizados de tipo de trabajo',
  })
  @IsOptional()
  @IsArray()
  trabajoTags?: string[];

  @ApiProperty({
    required: false,
    description: 'Número de WhatsApp del taller desde donde se envían los mensajes a clientes',
  })
  @IsOptional()
  @IsString()
  whatsappNumero?: string;
}
