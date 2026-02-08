import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { MeModule } from './me/me.module';
import { ResourcesModule } from './resources/resources.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { RedisModule } from './redis/redis.module';
import { DbModule } from './db/db.module';

describe('API modules', () => {
  it('are defined', () => {
    expect(AppModule).toBeDefined();
    expect(AuthModule).toBeDefined();
    expect(BookingsModule).toBeDefined();
    expect(IdempotencyModule).toBeDefined();
    expect(MeModule).toBeDefined();
    expect(ResourcesModule).toBeDefined();
    expect(TenancyModule).toBeDefined();
    expect(RedisModule).toBeDefined();
    expect(DbModule).toBeDefined();
  });
});
