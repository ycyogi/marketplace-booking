import type { MigrationBuilder } from 'node-pg-migrate';

// Keep the seed resource stable.
const SEED_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const SEED_RESOURCE_ID = '44444444-4444-4444-4444-444444444444';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('resources', {
    id: { type: 'uuid', primaryKey: true },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    timezone: { type: 'text', notNull: true, default: "'America/Denver'" },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('resources', ['tenant_id']);
  pgm.createIndex('resources', ['tenant_id', 'name'], { unique: true });

  // Ensure seeded booking resource exists.
  pgm.sql(`
    INSERT INTO resources (id, tenant_id, name, timezone, active)
    VALUES ('${SEED_RESOURCE_ID}', '${SEED_TENANT_ID}', 'Demo Staff #1 (Seed)', 'America/Denver', true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Add FK from bookings.resource_id -> resources.id
  pgm.addConstraint('bookings', 'bookings_resource_fk', {
    foreignKeys: {
      columns: 'resource_id',
      references: 'resources(id)',
      onDelete: 'RESTRICT',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('bookings', 'bookings_resource_fk');
  pgm.dropTable('resources');
}
