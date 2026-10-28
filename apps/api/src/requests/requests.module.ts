import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { MyJobsController } from './my-jobs.controller';
import { AiModule } from '../ai/ai.module';
import { AgendaModule } from '../agenda/agenda.module';
import { WorkshopsModule } from '../workshops/workshops.module';

@Module({
  imports: [AiModule, AgendaModule, WorkshopsModule],
  controllers: [RequestsController, MyJobsController],
  providers: [RequestsService],
})
export class RequestsModule {}
