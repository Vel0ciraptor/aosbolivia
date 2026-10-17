import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CustomerApprovalDecisionDto } from './dto/workshop-job.dto';

@ApiTags('Public Customer Approval')
@Controller('job-approval')
export class JobApprovalPublicController {
  constructor(private workshopsService: WorkshopsService) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Vista pública para que el cliente revise su diagnóstico y presupuesto desde WhatsApp',
  })
  getJobByToken(@Param('token') token: string) {
    return this.workshopsService.getJobByApprovalToken(token);
  }

  @Post(':token/decide')
  @ApiOperation({
    summary: 'El cliente aprueba o rechaza el presupuesto',
  })
  decideJob(
    @Param('token') token: string,
    @Body() dto: CustomerApprovalDecisionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.workshopsService.decideJobApproval(
      token,
      dto,
      ip || '127.0.0.1',
      userAgent || 'Unknown',
    );
  }

  @Get('public/exchange-rate')
  @ApiOperation({
    summary: 'Tipo de cambio actual oficial Dólar Blue Bolivia',
  })
  getRate() {
    return this.workshopsService.getExchangeRate();
  }
}
