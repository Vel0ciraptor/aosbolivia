import { Module } from '@nestjs/common';
import { TowsService } from './tows.service';
import { TowsController } from './tows.controller';
@Module({ controllers: [TowsController], providers: [TowsService] })
export class TowsModule {}
