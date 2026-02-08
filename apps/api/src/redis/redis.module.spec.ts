jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ ok: true })));

import { ConfigService } from '@nestjs/config';
import { REDIS, RedisModule } from './redis.module';

describe('RedisModule provider', () => {
  const provider: any = Reflect.getMetadata('providers', RedisModule)?.find(
    (p: any) => p.provide === REDIS,
  );

  it('throws when REDIS_URL missing', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(() => provider.useFactory(config)).toThrow('REDIS_URL is required');
  });

  it('creates redis client when url exists', () => {
    const config = { get: jest.fn().mockReturnValue('redis://localhost') } as unknown as ConfigService;
    expect(provider.useFactory(config)).toBeDefined();
  });
});
