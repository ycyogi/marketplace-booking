import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY, type DB } from '../db/db.module';

@Injectable()
export class IdempotencyService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<DB>) {}

  /**
   * Get a previously stored response for this (tenantId, key).
   */
  async get(
    tenantId: string,
    key: string,
  ): Promise<{ status: number | null; body: unknown } | null> {
    const row = await this.db
      .selectFrom('idempotency_requests')
      .select(['response_status', 'response_body'])
      .where('tenant_id', '=', tenantId)
      .where('key', '=', key)
      .executeTakeFirst();

    if (!row) return null;
    return { status: row.response_status, body: row.response_body };
  }

  /**
   * Store a response. If the key already exists, we do nothing.
   */
  async putIfAbsent(
    tenantId: string,
    key: string,
    status: number,
    body: unknown,
    requestHash?: string,
  ): Promise<void> {
    await this.db
      .insertInto('idempotency_requests')
      .values({
        tenant_id: tenantId,
        key,
        request_hash: requestHash ?? null,
        response_status: status,
        response_body: body as any,
        created_at: new Date(),
      })
      .onConflict((oc) => oc.columns(['tenant_id', 'key']).doNothing())
      .execute();
  }
}
