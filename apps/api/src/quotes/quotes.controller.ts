import { Controller, Post, Get, Param, Body, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotesService, CreateQuoteDto } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cotización' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Get('request/:requestId')
  @ApiOperation({ summary: 'Cotizaciones de una solicitud' })
  findByRequest(@Param('requestId') requestId: string) {
    return this.quotesService.findByRequest(requestId);
  }

  @Get('provider/:providerId')
  @ApiOperation({ summary: 'Cotizaciones de un proveedor' })
  findByProvider(@Param('providerId') providerId: string) {
    return this.quotesService.findByProvider(providerId);
  }

  @Get('workshop/:workshopId')
  @ApiOperation({ summary: 'Cotizaciones de un taller' })
  findByWorkshop(@Param('workshopId') workshopId: string) {
    return this.quotesService.findByWorkshop(workshopId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Actualizar estado de cotización' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.quotesService.updateStatus(id, body.status);
  }
}
