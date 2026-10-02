import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+58 412 1234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'MySecret123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'CLIENT', required: false })
  @IsOptional()
  @IsString()
  role?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MySecret123!' })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NuevaClave123!' })
  @IsString()
  @MinLength(6)
  password: string;
}
