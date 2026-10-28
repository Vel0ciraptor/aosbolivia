import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Seguimiento del cliente: el cliente ve en su app las fases por las que
 * pasa su vehículo en el taller (checklist), el historial y las fotos WebP.
 */
@ApiTags('My Jobs (Cliente)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my')
export class MyJobsController {
  constructor(private requestsService: RequestsService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Listar los trabajos de mis vehículos en taller' })
  findMyJobs(@Req() req: any) {
    return this.requestsService.findMyJobs(req.user.id);
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
