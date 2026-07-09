import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { RequestsModule } from './requests/requests.module';
import { PartsModule } from './parts/parts.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProvidersModule } from './providers/providers.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { TowsModule } from './tows/tows.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    RequestsModule,
    PartsModule,
    QuotesModule,
    ProvidersModule,
    WorkshopsModule,
    TowsModule,
    AiModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
