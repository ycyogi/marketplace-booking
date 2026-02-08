import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('idempotency_requests', {
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    key: { type: 'text', notNull: true },
    request_hash: { type: 'text' },
    response_status: { type: 'int' },
    response_body: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('idempotency_requests', 'idempotency_requests_pkey', {
    primaryKey: ['tenant_id', 'key'],
  });

  pgm.createIndex('idempotency_requests', ['created_at']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('idempotency_requests');
}
