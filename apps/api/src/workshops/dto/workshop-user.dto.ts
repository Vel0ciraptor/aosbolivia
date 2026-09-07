import { IsString, IsEmail, IsOptional, IsIn, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ROLES = ['SUPERVISOR', 'JEFE_MECANICO', 'MECANICO', 'INVENTARIO', 'CONTABILIDAD'];

export class CreateWorkshopUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan' })
  @IsString()
  @MinLength(3)
  emailPrefix: string;

  @ApiPropertyOptional({ example: '+58 412 1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: VALID_ROLES, example: 'MECANICO' })
  @IsString()
  @IsIn(VALID_ROLES)
  role: string;

  @ApiPropertyOptional({ example: 'MiContraseña123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class UpdateWorkshopUserDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+58 412 1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: VALID_ROLES, example: 'SUPERVISOR' })
  @IsOptional()
  @IsString()
  @IsIn(VALID_ROLES)
  role?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
