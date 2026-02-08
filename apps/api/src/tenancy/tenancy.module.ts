import { Global, Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [MembershipService, TenantGuard, RolesGuard],
  exports: [MembershipService, TenantGuard, RolesGuard],
})
export class TenancyModule {}
