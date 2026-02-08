import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'node:crypto';
import { KYSELY, type DB } from '../db/db.module';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { ResourcesService } from '../resources/resources.service';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<DB>,
    private readonly resources: ResourcesService,
    private readonly idem: IdempotencyService,
  ) {}

  private parseUtc(input: string, fieldName: string): Date {
    const d = new Date(input);
    if (Number.isNaN(d.valueOf()))
      throw new BadRequestException(`Invalid ${fieldName}`);
    return d;
  }

  async list(
    tenantId: string,
    query: { resourceId?: string; fromUtc?: string; toUtc?: string },
  ) {
    let q = this.db
      .selectFrom('bookings')
      .select([
        'id',
        'tenant_id',
        'resource_id',
        'status',
        'start_utc',
        'end_utc',
        'hold_expires_at',
        'idempotency_key',
        'created_at',
        'updated_at',
      ])
      .where('tenant_id', '=', tenantId);

    if (query.resourceId) {
      q = q.where('resource_id', '=', query.resourceId);
    }

    if (query.fromUtc) {
      const from = new Date(query.fromUtc);
      if (Number.isNaN(from.valueOf()))
        throw new BadRequestException('Invalid fromUtc');
      q = q.where('end_utc', '>', from);
    }

    if (query.toUtc) {
      const to = new Date(query.toUtc);
      if (Number.isNaN(to.valueOf()))
        throw new BadRequestException('Invalid toUtc');
      q = q.where('start_utc', '<', to);
    }

    return q.orderBy('start_utc', 'asc').execute();
  }

  async hold(
    tenantId: string,
    input: {
      resourceId: string;
      startUtc: string;
      endUtc: string;
      holdMinutes?: number;
      idempotencyKey: string;
    },
  ) {
    const start = this.parseUtc(input.startUtc, 'startUtc');
    const end = this.parseUtc(input.endUtc, 'endUtc');
    if (end <= start)
      throw new BadRequestException('endUtc must be after startUtc');

    const holdMinutes = input.holdMinutes ?? 5;
    if (!Number.isFinite(holdMinutes) || holdMinutes <= 0 || holdMinutes > 60) {
      throw new BadRequestException('holdMinutes must be between 1 and 60');
    }

    await this.resources.assertBelongsToTenant(input.resourceId, tenantId);

    const bookingId = randomUUID();
    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + holdMinutes * 60_000);

    try {
      await this.db
        .insertInto('bookings')
        .values({
          id: bookingId,
          tenant_id: tenantId,
          resource_id: input.resourceId,
          status: 'HOLD',
          start_utc: start,
          end_utc: end,
          hold_expires_at: holdExpiresAt,
          idempotency_key: input.idempotencyKey,
          created_at: now,
          updated_at: now,
        })
        .execute();
    } catch (err: unknown) {
      // Postgres errors:
      // 23505 unique_violation (idempotency)
      // 23P01 exclusion_violation (overlap constraint)
      const e = err as { code?: string };
      const code = e?.code;
      if (code === '23P01')
        throw new ConflictException('Time slot already booked/held');
      if (code === '23505') {
        const existing = await this.db
          .selectFrom('bookings')
          .select([
            'id',
            'resource_id',
            'status',
            'start_utc',
            'end_utc',
            'hold_expires_at',
          ])
          .where('tenant_id', '=', tenantId)
          .where('idempotency_key', '=', input.idempotencyKey)
          .executeTakeFirst();
        if (existing) return existing;
        throw new ConflictException('Duplicate request');
      }
      throw err;
    }

    return {
      id: bookingId,
      tenantId,
      resourceId: input.resourceId,
      status: 'HOLD',
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      holdExpiresAt: holdExpiresAt.toISOString(),
    };
  }

  async confirm(
    tenantId: string,
    input: {
      resourceId: string;
      startUtc: string;
      endUtc: string;
      idempotencyKey: string;
    },
  ) {
    const start = this.parseUtc(input.startUtc, 'startUtc');
    const end = this.parseUtc(input.endUtc, 'endUtc');
    if (end <= start)
      throw new BadRequestException('endUtc must be after startUtc');

    await this.resources.assertBelongsToTenant(input.resourceId, tenantId);

    const bookingId = randomUUID();

    try {
      await this.db
        .insertInto('bookings')
        .values({
          id: bookingId,
          tenant_id: tenantId,
          resource_id: input.resourceId,
          status: 'CONFIRMED',
          start_utc: start,
          end_utc: end,
          hold_expires_at: null,
          idempotency_key: input.idempotencyKey,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();
    } catch (err: unknown) {
      // Postgres errors:
      // 23505 unique_violation (idempotency)
      // 23P01 exclusion_violation (overlap constraint)
      const e = err as { code?: string };
      const code = e?.code;
      if (code === '23P01')
        throw new ConflictException('Time slot already booked/held');
      if (code === '23505') {
        const existing = await this.db
          .selectFrom('bookings')
          .select(['id', 'resource_id', 'status', 'start_utc', 'end_utc'])
          .where('tenant_id', '=', tenantId)
          .where('idempotency_key', '=', input.idempotencyKey)
          .executeTakeFirst();
        if (existing) return existing;
        throw new ConflictException('Duplicate request');
      }
      throw err;
    }

    return {
      id: bookingId,
      tenantId,
      resourceId: input.resourceId,
      status: 'CONFIRMED',
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
    };
  }

  async confirmHold(
    tenantId: string,
    bookingId: string,
    idempotencyKey: string,
  ) {
    const prev = await this.idem.get(tenantId, idempotencyKey);
    if (prev) return prev.body as { id: string; status: string };

    const booking = await this.db
      .selectFrom('bookings')
      .select([
        'id',
        'status',
        'resource_id',
        'start_utc',
        'end_utc',
        'hold_expires_at',
      ])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === 'CONFIRMED') {
      const response = { id: bookingId, status: 'CONFIRMED' as const };
      await this.idem.putIfAbsent(tenantId, idempotencyKey, 200, response);
      return response;
    }

    if (booking.status !== 'HOLD') {
      throw new ConflictException(
        `Cannot confirm booking with status ${booking.status}`,
      );
    }

    if (!booking.hold_expires_at) {
      throw new ConflictException('Hold missing hold_expires_at');
    }

    const now = new Date();
    if (booking.hold_expires_at <= now) {
      // Best-effort mark it expired.
      await this.db
        .updateTable('bookings')
        .set({ status: 'EXPIRED', updated_at: now })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', bookingId)
        .execute();
      throw new ConflictException('Hold expired');
    }

    try {
      await this.db
        .updateTable('bookings')
        .set({ status: 'CONFIRMED', hold_expires_at: null, updated_at: now })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', bookingId)
        .execute();
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === '23P01') {
        throw new ConflictException('Time slot already booked/held');
      }
      throw err;
    }

    const response = { id: bookingId, status: 'CONFIRMED' as const };
    await this.idem.putIfAbsent(tenantId, idempotencyKey, 200, response);
    return response;
  }

  async reschedule(
    tenantId: string,
    bookingId: string,
    input: { startUtc: string; endUtc: string; idempotencyKey: string },
  ) {
    const prev = await this.idem.get(tenantId, input.idempotencyKey);
    if (prev) return prev.body as unknown;

    const start = this.parseUtc(input.startUtc, 'startUtc');
    const end = this.parseUtc(input.endUtc, 'endUtc');
    if (end <= start) throw new BadRequestException('endUtc must be after startUtc');

    const booking = await this.db
      .selectFrom('bookings')
      .select([
        'id',
        'status',
        'resource_id',
        'start_utc',
        'end_utc',
        'hold_expires_at',
      ])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== 'CONFIRMED') {
      throw new ConflictException(
        `Only CONFIRMED bookings can be rescheduled (current status: ${booking.status})`,
      );
    }

    const now = new Date();
    try {
      await this.db
        .updateTable('bookings')
        .set({
          start_utc: start,
          end_utc: end,
          updated_at: now,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', bookingId)
        .execute();
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === '23P01') {
        throw new ConflictException('Time slot already booked/held');
      }
      throw err;
    }

    const response = {
      id: bookingId,
      status: 'CONFIRMED',
      resourceId: booking.resource_id,
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
    };

    await this.idem.putIfAbsent(tenantId, input.idempotencyKey, 200, response);
    return response;
  }

  async cancel(tenantId: string, bookingId: string, idempotencyKey: string) {
    // Idempotency: if we've already processed this cancel request, return stored response.
    const prev = await this.idem.get(tenantId, idempotencyKey);
    if (prev) return prev.body as { id: string; status: string };

    const booking = await this.db
      .selectFrom('bookings')
      .select(['id', 'status', 'resource_id', 'start_utc', 'end_utc'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException('Booking not found');

    // Treat canceling an already-canceled booking as success (idempotent behavior).
    if (booking.status !== 'CANCELED') {
      await this.db
        .updateTable('bookings')
        .set({
          status: 'CANCELED',
          updated_at: new Date(),
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', bookingId)
        .execute();
    }

    const response = {
      id: bookingId,
      status: 'CANCELED',
    };

    await this.idem.putIfAbsent(tenantId, idempotencyKey, 200, response);
    return response;
  }
}
