import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { Ctx } from '../tenancy/ctx.decorator';
import type { RequestContext } from '../tenancy/tenancy.types';

@ApiTags('me')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('me')
export class MeController {
  @Get('context')
  getContext(@Ctx() ctx: RequestContext) {
    return ctx;
  }
}
