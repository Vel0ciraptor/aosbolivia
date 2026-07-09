import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role, UserStatus } from '../common/enums';

class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsString()
  @IsIn(Object.values(UserStatus))
  status: UserStatus;
}

class UpdateUserRoleDto {
  @ApiProperty({ enum: Role })
  @IsString()
  @IsIn(Object.values(Role))
  role: Role;
}

class UpdateBusinessStatusDto {
  @ApiProperty({ example: 'ACTIVE' })
  @IsString()
  estado: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'KPIs globales del sistema' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios con filtros' })
  listUsers(@Query('role') role?: string, @Query('status') status?: string, @Query('search') search?: string) {
    return this.adminService.listUsers({ role, status, search });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detalle completo de un usuario' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activar/bloquear usuario' })
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.status as UserStatus);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Cambiar rol de un usuario' })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role as Role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('providers')
  @ApiOperation({ summary: 'Listar todos los proveedores' })
  listProviders() {
    return this.adminService.listProviders();
  }

  @Patch('providers/:id/status')
  @ApiOperation({ summary: 'Activar/suspender proveedor' })
  updateProviderStatus(@Param('id') id: string, @Body() dto: UpdateBusinessStatusDto) {
    return this.adminService.updateProviderStatus(id, dto.estado);
  }

  @Get('workshops')
  @ApiOperation({ summary: 'Listar todos los talleres' })
  listWorkshops() {
    return this.adminService.listWorkshops();
  }

  @Patch('workshops/:id/status')
  @ApiOperation({ summary: 'Activar/suspender taller' })
  updateWorkshopStatus(@Param('id') id: string, @Body() dto: UpdateBusinessStatusDto) {
    return this.adminService.updateWorkshopStatus(id, dto.estado);
  }

  @Get('tows')
  @ApiOperation({ summary: 'Listar todos los servicios de grúa' })
  listTows() {
    return this.adminService.listTows();
  }

  @Patch('tows/:id/status')
  @ApiOperation({ summary: 'Activar/suspender grúa' })
  updateTowStatus(@Param('id') id: string, @Body() dto: UpdateBusinessStatusDto) {
    return this.adminService.updateTowStatus(id, dto.estado);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Listar todas las solicitudes' })
  listRequests(@Query('categoria') categoria?: string, @Query('estado') estado?: string) {
    return this.adminService.listAllRequests({ categoria, estado });
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Eliminar solicitud' })
  deleteRequest(@Param('id') id: string) {
    return this.adminService.deleteRequest(id);
  }

  @Get('quotes')
  @ApiOperation({ summary: 'Listar todas las cotizaciones' })
  listQuotes(@Query('estado') estado?: string) {
    return this.adminService.listAllQuotes({ estado });
  }

  @Delete('quotes/:id')
  @ApiOperation({ summary: 'Eliminar cotización' })
  deleteQuote(@Param('id') id: string) {
    return this.adminService.deleteQuote(id);
  }
}
