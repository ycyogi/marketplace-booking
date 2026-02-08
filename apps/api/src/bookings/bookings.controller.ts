import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Ctx } from '../tenancy/ctx.decorator';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import type { RequestContext } from '../tenancy/tenancy.types';
import { BookingsService } from './bookings.service';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Roles('admin', 'staff')
  @Get()
  list(
    @Ctx() ctx: RequestContext,
    @Query() q: { resourceId?: string; fromUtc?: string; toUtc?: string },
  ) {
    return this.bookings.list(ctx.tenantId, q);
  }

  @Roles('admin', 'staff')
  @Post('hold')
  hold(
    @Ctx() ctx: RequestContext,
    @Body()
    body: {
      resourceId: string;
      startUtc: string;
      endUtc: string;
      holdMinutes?: number;
      idempotencyKey: string;
    },
  ) {
    return this.bookings.hold(ctx.tenantId, body);
  }

  // Direct confirmation (no prior hold)
  @Roles('admin', 'staff')
  @Post('confirm')
  confirm(
    @Ctx() ctx: RequestContext,
    @Body()
    body: {
      resourceId: string;
      startUtc: string;
      endUtc: string;
      idempotencyKey: string;
    },
  ) {
    return this.bookings.confirm(ctx.tenantId, body);
  }

  // Confirm a previously created hold
  @Roles('admin', 'staff')
  @Post(':id/confirm')
  confirmHold(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: { idempotencyKey: string },
  ) {
    return this.bookings.confirmHold(ctx.tenantId, id, body.idempotencyKey);
  }

  @Roles('admin', 'staff')
  @Post(':id/reschedule')
  reschedule(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body()
    body: {
      startUtc: string;
      endUtc: string;
      idempotencyKey: string;
    },
  ) {
    return this.bookings.reschedule(ctx.tenantId, id, body);
  }

  @Roles('admin', 'staff')
  @Post(':id/cancel')
  cancel(
    @Ctx() ctx: RequestContext,
    @Param('id') id: string,
    @Body() body: { idempotencyKey: string },
  ) {
    return this.bookings.cancel(ctx.tenantId, id, body.idempotencyKey);
  }
}
