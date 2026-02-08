/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt.strategy';
import { MembershipService } from './membership.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly memberships: MembershipService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const tenantId =
      (req.headers?.['x-tenant-id'] as string | undefined) ??
      (req.headers?.['X-Tenant-Id'] as string | undefined);
    if (!tenantId) throw new BadRequestException('Missing X-Tenant-Id');

    const user = req.user as JwtUser | undefined;
    if (!user?.sub) throw new UnauthorizedException();

    const membership = await this.memberships.getMembershipBySub(
      user.sub,
      tenantId,
    );
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('No tenant access');
    }

    req.ctx = {
      sub: user.sub,
      userId: membership.userId,
      tenantId,
      role: membership.role,
    };

    return true;
  }
}
