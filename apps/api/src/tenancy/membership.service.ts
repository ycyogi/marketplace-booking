/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { KYSELY, type DB } from '../db/db.module';
import { REDIS } from '../redis/redis.module';
import { Kysely } from 'kysely';

@Injectable()
export class MembershipService {
  constructor(
    @Inject(KYSELY) private readonly db: Kysely<DB>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async getMembershipBySub(
    sub: string,
    tenantId: string,
  ): Promise<{
    userId: string;
    role: 'owner' | 'admin' | 'staff';
    status: string;
  } | null> {
    const cacheKey = `mship:${sub}:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.none ? null : parsed;
    }

    const row = await this.db
      .selectFrom('users')
      .innerJoin('memberships', 'memberships.user_id', 'users.id')
      .select([
        'users.id as userId',
        'memberships.role as role',
        'memberships.status as status',
      ])
      .where('users.keycloak_sub', '=', sub)
      .where('memberships.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!row) {
      await this.redis.set(cacheKey, JSON.stringify({ none: true }), 'EX', 60);
      return null;
    }

    await this.redis.set(cacheKey, JSON.stringify(row), 'EX', 15 * 60);
    return row;
  }
}
