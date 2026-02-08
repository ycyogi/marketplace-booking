import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  const memberships = { getMembershipBySub: jest.fn() };
  const guard = new TenantGuard(memberships as any);

  const ctx = (req: any) =>
    ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;

  beforeEach(() => memberships.getMembershipBySub.mockReset());

  it('requires x-tenant-id header', async () => {
    await expect(guard.canActivate(ctx({ headers: {}, user: { sub: 's' } }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires authenticated user', async () => {
    await expect(
      guard.canActivate(ctx({ headers: { 'x-tenant-id': 't1' }, user: undefined })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires active membership', async () => {
    memberships.getMembershipBySub.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ headers: { 'x-tenant-id': 't1' }, user: { sub: 's' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sets request context when allowed', async () => {
    memberships.getMembershipBySub.mockResolvedValue({ userId: 'u1', role: 'admin', status: 'active' });
    const req: any = { headers: { 'x-tenant-id': 't1' }, user: { sub: 's' } };

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.ctx).toEqual({ sub: 's', userId: 'u1', tenantId: 't1', role: 'admin' });
  });
});
