jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({})) }));
jest.mock('kysely', () => ({
  Kysely: jest.fn().mockImplementation(() => ({})),
  PostgresDialect: jest.fn().mockImplementation(() => ({})),
}));

import { ConfigService } from '@nestjs/config';
import { DbModule, KYSELY } from './db.module';

describe('DbModule provider', () => {
  const provider: any = Reflect.getMetadata('providers', DbModule)?.find(
    (p: any) => p.provide === KYSELY,
  );

  it('throws when DATABASE_URL missing', () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(() => provider.useFactory(config)).toThrow('DATABASE_URL is required');
  });

  it('creates kysely when url exists', () => {
    const config = { get: jest.fn().mockReturnValue('postgres://db') } as unknown as ConfigService;
    expect(provider.useFactory(config)).toBeDefined();
  });
});
