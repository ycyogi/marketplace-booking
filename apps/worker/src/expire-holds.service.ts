import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class ExpireHoldsService implements OnModuleInit {
  private readonly log = new Logger(ExpireHoldsService.name);
  private pool: Pool;

  constructor(private readonly config: ConfigService) {
    const databaseUrl = this.config.get<string>('databaseUrl');
    if (!databaseUrl) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  onModuleInit() {
    const intervalMs = this.config.get<number>('expireHoldsIntervalMs') ?? 30_000;
    this.log.log(`Expire holds worker started (intervalMs=${intervalMs})`);

    // Kick immediately, then run on interval.
    void this.tick();
    setInterval(() => void this.tick(), intervalMs).unref();
  }

  private async tick() {
    try {
      const res = await this.pool.query(
        `
        UPDATE bookings
        SET status = 'EXPIRED', updated_at = now()
        WHERE status = 'HOLD'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at <= now()
        RETURNING id;
        `,
      );

      if (res.rowCount && res.rowCount > 0) {
        this.log.log(`Expired ${res.rowCount} holds`);
      }
    } catch (err) {
      this.log.error('Expire holds tick failed', err as any);
    }
  }
}
