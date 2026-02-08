import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('throws when issuer missing', () => {
    const cfg = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    expect(() => new JwtStrategy(cfg)).toThrow('KEYCLOAK_ISSUER is required');
  });

  it('validate maps payload', () => {
    const cfg = { get: jest.fn().mockReturnValue('https://issuer') } as unknown as ConfigService;
    const s = new JwtStrategy(cfg);
    expect(s.validate({ sub: 'abc', email: 'x@y.com' })).toEqual({ sub: 'abc', email: 'x@y.com' });
    expect(s.validate({})).toEqual({ sub: '', email: undefined });
  });
});
