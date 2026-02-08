import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ctx } from '../tenancy/ctx.decorator';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import type { RequestContext } from '../tenancy/tenancy.types';
import { ResourcesService } from './resources.service';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  list(@Ctx() ctx: RequestContext) {
    return this.resources.list(ctx.tenantId);
  }

  @Post()
  @Roles('owner', 'admin')
  create(
    @Ctx() ctx: RequestContext,
    @Body() body: { name: string; timezone?: string },
  ) {
    return this.resources.create(ctx.tenantId, body);
  }
}
