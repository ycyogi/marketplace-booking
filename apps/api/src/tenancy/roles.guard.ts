/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { TenantRole } from './tenancy.types';

const ROLE_RANK: Record<TenantRole, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.get<TenantRole[]>(ROLES_KEY, context.getHandler()) ?? [];
    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const role = req.ctx?.role as TenantRole | undefined;
    if (!role) return false;

    // Hierarchy: owner ≥ admin ≥ staff
    // If a route requires "staff", admins/owners can also access.
    const userRank = ROLE_RANK[role] ?? 0;
    return required.some((r) => userRank >= (ROLE_RANK[r] ?? 0));
  }
}
