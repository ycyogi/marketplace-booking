import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeCtx = (role?: string) =>
    ({
      getHandler: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ ctx: { role } }) }),
    }) as any;

  it('allows when no required roles', () => {
    const reflector = { get: jest.fn().mockReturnValue([]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeCtx('staff'))).toBe(true);
  });

  it('denies when role missing', () => {
    const reflector = { get: jest.fn().mockReturnValue(['staff']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeCtx(undefined))).toBe(false);
  });

  it('applies hierarchy owner >= admin >= staff', () => {
    const reflector = { get: jest.fn().mockReturnValue(['admin']) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(makeCtx('owner'))).toBe(true);
    expect(guard.canActivate(makeCtx('staff'))).toBe(false);
  });
});
