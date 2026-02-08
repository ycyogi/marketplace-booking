import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'node:crypto';
import { KYSELY, type DB } from '../db/db.module';

@Injectable()
export class ResourcesService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<DB>) {}

  async list(tenantId: string) {
    return this.db
      .selectFrom('resources')
      .select(['id', 'name', 'timezone', 'active', 'created_at', 'updated_at'])
      .where('tenant_id', '=', tenantId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  async create(tenantId: string, input: { name: string; timezone?: string }) {
    const id = randomUUID();
    const timezone = input.timezone ?? 'America/Denver';

    await this.db
      .insertInto('resources')
      .values({
        id,
        tenant_id: tenantId,
        name: input.name,
        timezone,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    return { id, tenantId, name: input.name, timezone, active: true };
  }

  async assertBelongsToTenant(resourceId: string, tenantId: string) {
    const row = await this.db
      .selectFrom('resources')
      .select(['id'])
      .where('id', '=', resourceId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!row) throw new NotFoundException('Resource not found');
    return row;
  }
}
