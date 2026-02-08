import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redisUrl');
        if (!redisUrl) throw new Error('REDIS_URL is required');
        return new Redis(redisUrl);
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
