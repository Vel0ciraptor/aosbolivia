import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { AiModule } from '../ai/ai.module';
import { AgendaModule } from '../agenda/agenda.module';

@Module({
  imports: [AiModule, AgendaModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
