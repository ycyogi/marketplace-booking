import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Replace the older constraint that only protected CONFIRMED bookings.
  pgm.sql(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlap_confirmed;`);

  // Prevent overlapping *active* bookings per resource.
  // - HOLD blocks the slot until it is either CONFIRMED, CANCELED, or EXPIRED.
  // - Worker/job should promptly mark expired holds as EXPIRED so the slot frees up.
  pgm.sql(`
    ALTER TABLE bookings
    ADD CONSTRAINT no_overlap_active
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_utc, end_utc, '[)') WITH &&
    )
    WHERE (status IN ('HOLD', 'CONFIRMED'));
  `);

  pgm.createIndex('bookings', ['status', 'hold_expires_at']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('bookings', ['status', 'hold_expires_at']);
  pgm.sql(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlap_active;`);

  // Best-effort restore of the original constraint.
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
