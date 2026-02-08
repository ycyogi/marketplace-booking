import configuration from './configuration';

describe('configuration', () => {
  it('returns env-backed config', () => {
    process.env.PORT = '3001';
    process.env.DATABASE_URL = 'postgres://db';
    process.env.REDIS_URL = 'redis://r';
    process.env.KEYCLOAK_ISSUER = 'https://issuer';
    process.env.KEYCLOAK_AUDIENCE = 'aud';

    const cfg = configuration();
    expect(cfg.port).toBe(3001);
    expect(cfg.databaseUrl).toBe('postgres://db');
    expect(cfg.redisUrl).toBe('redis://r');
  });
});
