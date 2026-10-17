import { Module } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';
import { JobApprovalPublicController } from './job-approval.controller';
import { ExchangeRateService } from './exchange-rate.service';
import { WhatsAppService } from './whatsapp.service';
import { ExcelImportService } from './excel-import.service';

@Module({
  controllers: [WorkshopsController, JobApprovalPublicController],
  providers: [
    WorkshopsService,
    ExchangeRateService,
    WhatsAppService,
    ExcelImportService,
  ],
  exports: [
    WorkshopsService,
    ExchangeRateService,
    WhatsAppService,
    ExcelImportService,
  ],
})
export class WorkshopsModule {}

