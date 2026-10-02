import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from '../common/enums';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario con rol específico' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto, dto.role as Role);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens de sesión' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar enlace para restablecer contraseña' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con el enlace recibido' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getMe(@Req() req: any) {
    // Si es WorkshopUser, devolver perfil de WorkshopUser
    if (req.user.role === 'WORKSHOP_USER') {
      return this.authService.getWorkshopUserProfile(req.user.id);
    }
    return this.authService.getProfile(req.user.id);
  }
}
