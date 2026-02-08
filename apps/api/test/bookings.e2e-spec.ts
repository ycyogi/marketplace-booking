import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { KYSELY } from '../src/db/db.module';
import { REDIS } from '../src/redis/redis.module';
import { TenantGuard } from '../src/tenancy/tenant.guard';
import type { TenantRole } from '../src/tenancy/tenancy.types';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const RESOURCE_ID = '44444444-4444-4444-4444-444444444444';

class AllowJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    // Mimic JwtAuthGuard attaching a user.
    req.user = { sub: 'test-sub' };
    return true;
  }
}

class TestTenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    const tenantId = (req.headers?.['x-tenant-id'] as string | undefined) ?? TENANT_ID;
    const roleHeader = req.headers?.['x-test-role'] as string | undefined;
    const role = (roleHeader as TenantRole | undefined) ?? undefined;

    req.ctx = {
      sub: 'test-sub',
      userId: '22222222-2222-2222-2222-222222222222',
      tenantId,
      role,
    };

    return true;
  }
}

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be set for e2e tests');
    }

    pool = new Pool({ connectionString: databaseUrl });

    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // We want to test RolesGuard behavior, not JWT/Tenant integration.
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowJwtGuard)
      .overrideGuard(TenantGuard)
      .useClass(TestTenantGuard)
      .compile();

    app = modRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Ensure external connections are closed so Jest can exit cleanly.
    try {
      const redis = app.get(REDIS) as any;
      if (redis?.quit) await redis.quit();
      else if (redis?.disconnect) redis.disconnect();
    } catch {
      // ignore
    }

    try {
      const kysely = app.get(KYSELY);
      // Kysely#destroy closes the underlying pg Pool.
      await kysely.destroy();
    } catch {
      // ignore
    }

    await app?.close();
    await pool?.end();
  });

  beforeEach(async () => {
    // Clean out tenant data to make tests repeatable.
    await pool.query('DELETE FROM idempotency_requests WHERE tenant_id = $1', [
      TENANT_ID,
    ]);
    await pool.query('DELETE FROM bookings WHERE tenant_id = $1', [TENANT_ID]);
  });

  it('denies listing bookings without a role', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('x-tenant-id', TENANT_ID)
      // intentionally omit x-test-role
      .expect(403);
  });

  it('allows staff to list bookings', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'staff')
      .expect(200);
  });

  it('allows owner to access admin/staff endpoints via hierarchy', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'owner')
      .expect(200);
  });

  it('hold → confirm → reschedule → cancel happy path (admin)', async () => {
    const startUtc = '2026-02-08T01:00:00Z';
    const endUtc = '2026-02-08T02:00:00Z';

    const hold = await request(app.getHttpServer())
      .post('/bookings/hold')
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'admin')
      .send({
        resourceId: RESOURCE_ID,
        startUtc,
        endUtc,
        holdMinutes: 10,
        idempotencyKey: 'hold-1',
      })
      .expect(201);

    const bookingId = hold.body.id as string;
    expect(bookingId).toBeTruthy();
    expect(hold.body.status).toBe('HOLD');

    await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/confirm`)
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'admin')
      .send({ idempotencyKey: 'confirm-1' })
      .expect(201);

    const rescheduled = await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/reschedule`)
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'admin')
      .send({
        startUtc: '2026-02-08T03:00:00Z',
        endUtc: '2026-02-08T04:00:00Z',
        idempotencyKey: 'reschedule-1',
      })
      .expect(201);

    expect(rescheduled.body.id).toBe(bookingId);
    expect(rescheduled.body.status).toBe('CONFIRMED');

    await request(app.getHttpServer())
      .post(`/bookings/${bookingId}/cancel`)
      .set('x-tenant-id', TENANT_ID)
      .set('x-test-role', 'admin')
      .send({ idempotencyKey: 'cancel-1' })
      .expect(201);
  });
});
