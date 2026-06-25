import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { HomePanelModule } from './home-panel/home-panel.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: 120,
    }]),
    AuthModule,
    HomePanelModule,
  ],
})
export class AppModule {}
