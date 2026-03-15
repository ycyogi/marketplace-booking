import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('citext', { ifNotExists: true });
  pgm.createExtension('btree_gist', { ifNotExists: true });

  pgm.createType('tenant_role', ['owner', 'admin', 'staff']);

  pgm.createTable('tenants', {
    id: { type: 'uuid', primaryKey: true },
    name: { type: 'text', notNull: true },
    timezone: { type: 'text', notNull: true, default: "'America/Denver'" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true },
    keycloak_sub: { type: 'text', notNull: true, unique: true },
    email: { type: 'citext', unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('memberships', {
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    role: { type: 'tenant_role', notNull: true },
    status: { type: 'text', notNull: true, default: "'active'" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  }, {
    constraints: {
      primaryKey: ['tenant_id', 'user_id'],
    },
  });

  pgm.createIndex('memberships', 'user_id');

  // Bookings (source of truth)
  pgm.createType('booking_status', ['HOLD', 'CONFIRMED', 'CANCELED', 'EXPIRED']);

  pgm.createTable('bookings', {
    id: { type: 'uuid', primaryKey: true },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    resource_id: { type: 'uuid', notNull: true },
    status: { type: 'booking_status', notNull: true },
    start_utc: { type: 'timestamptz', notNull: true },
    end_utc: { type: 'timestamptz', notNull: true },
    hold_expires_at: { type: 'timestamptz' },
    idempotency_key: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('bookings', ['tenant_id', 'idempotency_key'], { unique: true });
  pgm.createIndex('bookings', ['resource_id', 'start_utc']);

  // Prevent overlapping CONFIRMED bookings per resource
  // (node-pg-migrate's exclusion helper API varies across major versions; use raw SQL.)
  pgm.sql(`
    ALTER TABLE bookings
    ADD CONSTRAINT no_overlap_confirmed
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_utc, end_utc, '[)') WITH &&
    )
    WHERE (status = 'CONFIRMED');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('bookings');
  pgm.dropType('booking_status');

  pgm.dropTable('memberships');
  pgm.dropTable('users');
  pgm.dropTable('tenants');

  pgm.dropType('tenant_role');

  // Extensions can be shared; usually keep them.
  // pgm.dropExtension('btree_gist');
  // pgm.dropExtension('citext');
}
