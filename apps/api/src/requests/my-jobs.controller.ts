import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerApprovalDecisionDto } from '../workshops/dto/workshop-job.dto';

/**
 * Seguimiento del cliente: el cliente ve en su app las fases por las que
 * pasa su vehículo en taller (checklist), el historial, las fotos WebP
 * y aprueba o rechaza el presupuesto con firma (sin WhatsApp).
 */
@ApiTags('My Jobs (Cliente)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my')
export class MyJobsController {
  constructor(
    private requestsService: RequestsService,
    private workshopsService: WorkshopsService,
  ) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Listar los trabajos de mis vehículos en taller' })
  findMyJobs(@Req() req: any) {
    return this.requestsService.findMyJobs(req.user.id);
  }

  @Get('jobs/:id/approval')
  @ApiOperation({
    summary: 'Detalle del presupuesto pendiente de aprobación del cliente',
  })
  findMyJobApproval(@Param('id') id: string, @Req() req: any) {
    return this.workshopsService.getMyJobApproval(id, req.user.id);
  }

  @Post('jobs/:id/approval/decide')
  @ApiOperation({
    summary: 'El cliente aprueba o rechaza el presupuesto con firma desde su app',
  })
  decideMyJobApproval(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CustomerApprovalDecisionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.workshopsService.decideMyJobApproval(
      id,
      req.user.id,
      dto,
      ip || '127.0.0.1',
      userAgent || 'Unknown',
    );
  }

  @Get('jobs/:id')
  @ApiOperation({
    summary:
      'Detalle de seguimiento: fases, historial y fotos del vehículo (WebP)',
  })
  findMyJobDetail(@Param('id') id: string, @Req() req: any) {
    return this.requestsService.findMyJobDetail(id, req.user);
  }
}
