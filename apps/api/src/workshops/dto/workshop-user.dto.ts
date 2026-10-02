import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ROLES = [
  'SUPERVISOR',
  'JEFE_MECANICO',
  'MECANICO',
  'INVENTARIO',
  'CONTABILIDAD',
];

export class CreateWorkshopUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan' })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, {
    message:
      'El prefijo del correo solo puede contener letras minúsculas, números, punto, guion o guion bajo',
  })
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

export class ResetWorkshopUserPasswordDto {
  @ApiPropertyOptional({
    example: 'MiContraseña123!',
    description: 'Si se omite se genera una contraseña automática',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class ChangeOwnPasswordDto {
  @ApiProperty({ example: 'ContraseñaActual123' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'NuevaContraseña123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
