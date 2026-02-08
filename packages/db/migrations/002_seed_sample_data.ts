import type { MigrationBuilder } from 'node-pg-migrate';

// Hard-coded UUIDs so the data is stable across environments.
const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const USER_OWNER_ID = '22222222-2222-2222-2222-222222222222';
const USER_STAFF_ID = '33333333-3333-3333-3333-333333333333';
const RESOURCE_ID = '44444444-4444-4444-4444-444444444444';
const BOOKING_ID = '55555555-5555-5555-5555-555555555555';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Tenant
  pgm.sql(
    `INSERT INTO tenants (id, name, timezone)
     VALUES ('${TENANT_ID}', 'Demo Salon (Seed)', 'America/Denver')
     ON CONFLICT (id) DO NOTHING;`,
  );

  // Staff users (these are *staff identities* that would normally come from Keycloak)
  pgm.sql(
    `INSERT INTO users (id, keycloak_sub, email)
     VALUES
      ('${USER_OWNER_ID}', '${USER_OWNER_ID}', 'owner@demo-salon.local'),
      ('${USER_STAFF_ID}', '${USER_STAFF_ID}', 'staff@demo-salon.local')
     ON CONFLICT (id) DO NOTHING;`,
  );

  // Memberships
  pgm.sql(
    `INSERT INTO memberships (tenant_id, user_id, role, status)
     VALUES
      ('${TENANT_ID}', '${USER_OWNER_ID}', 'owner', 'active'),
      ('${TENANT_ID}', '${USER_STAFF_ID}', 'staff', 'active')
     ON CONFLICT (tenant_id, user_id) DO NOTHING;`,
  );

  // One sample CONFIRMED booking (demonstrates the exclusion constraint)
  // Note: resource_id isn't a FK yet; we treat resources as domain entities to add later.
  pgm.sql(
    `INSERT INTO bookings (id, tenant_id, resource_id, status, start_utc, end_utc, idempotency_key)
     VALUES (
       '${BOOKING_ID}',
       '${TENANT_ID}',
       '${RESOURCE_ID}',
       'CONFIRMED',
       '2026-02-08T17:00:00Z',
       '2026-02-08T17:30:00Z',
       'seed-booking-1'
     )
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;`,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM bookings WHERE id = '${BOOKING_ID}';`);
  pgm.sql(`DELETE FROM memberships WHERE tenant_id = '${TENANT_ID}' AND user_id IN ('${USER_OWNER_ID}', '${USER_STAFF_ID}');`);
  pgm.sql(`DELETE FROM users WHERE id IN ('${USER_OWNER_ID}', '${USER_STAFF_ID}');`);
  pgm.sql(`DELETE FROM tenants WHERE id = '${TENANT_ID}';`);
}
