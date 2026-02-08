import { ConfigService } from '@nestjs/config';
import { ExpireHoldsService } from './expire-holds.service';

jest.mock('pg', () => {
  const query = jest.fn().mockResolvedValue({ rowCount: 0 });
  return {
    Pool: jest.fn(() => ({ query })),
    __query: query,
  };
});

describe('ExpireHoldsService', () => {
  it('throws when DATABASE_URL missing', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(() => new ExpireHoldsService(config)).toThrow('DATABASE_URL is required');
  });

  it('starts and schedules tick', () => {
    const config = {
      get: jest
        .fn()
        .mockImplementation((k: string) => (k === 'databaseUrl' ? 'postgres://x' : 10_000)),
    } as unknown as ConfigService;

    const svc = new ExpireHoldsService(config);
    expect(() => svc.onModuleInit()).not.toThrow();
  });
});
