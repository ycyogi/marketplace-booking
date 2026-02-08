import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { Ctx } from '../tenancy/ctx.decorator';
import type { RequestContext } from '../tenancy/tenancy.types';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('me')
export class MeController {
  @Get('context')
  getContext(@Ctx() ctx: RequestContext) {
    return ctx;
  }
}
