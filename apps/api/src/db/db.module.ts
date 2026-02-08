/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DB {
  tenants: {
    id: string;
    name: string;
    timezone: string;
    created_at: Date;
    updated_at: Date;
  };
  users: {
    id: string;
    keycloak_sub: string;
    email: string | null;
    created_at: Date;
    updated_at: Date;
  };
  memberships: {
    tenant_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'staff';
    status: 'active' | 'invited' | 'suspended';
    created_at: Date;
    updated_at: Date;
  };
  resources: {
    id: string;
    tenant_id: string;
    name: string;
    timezone: string;
    active: boolean;
    created_at: Date;
    updated_at: Date;
  };
  bookings: {
    id: string;
    tenant_id: string;
    resource_id: string;
    status: 'HOLD' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED';
    start_utc: Date;
    end_utc: Date;
    hold_expires_at: Date | null;
    idempotency_key: string;
    created_at: Date;
    updated_at: Date;
  };
  idempotency_requests: {
    tenant_id: string;
    key: string;
    request_hash: string | null;
    response_status: number | null;
    response_body: unknown;
    created_at: Date;
  };
}

export const KYSELY = Symbol('KYSELY_DB');

@Global()
@Module({
  providers: [
    {
      provide: KYSELY,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('databaseUrl');
        if (!databaseUrl) throw new Error('DATABASE_URL is required');

        const pool = new Pool({ connectionString: databaseUrl });
        return new Kysely<DB>({
          dialect: new PostgresDialect({ pool }),
        });
      },
    },
  ],
  exports: [KYSELY],
})
export class DbModule {}
