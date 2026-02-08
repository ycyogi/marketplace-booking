import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExpireHoldsService } from './expire-holds.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          databaseUrl: process.env.DATABASE_URL,
          expireHoldsIntervalMs: process.env.EXPIRE_HOLDS_INTERVAL_MS
            ? Number(process.env.EXPIRE_HOLDS_INTERVAL_MS)
            : undefined,
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, ExpireHoldsService],
})
export class AppModule {}
