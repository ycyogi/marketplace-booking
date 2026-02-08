import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { KYSELY } from '../src/db/db.module';
import { REDIS } from '../src/redis/redis.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    try {
      const redis = app.get(REDIS) as any;
      if (redis?.quit) await redis.quit();
      else if (redis?.disconnect) redis.disconnect();
    } catch {
      // ignore
    }

    try {
      const kysely = app.get(KYSELY);
      await kysely.destroy();
    } catch {
      // ignore
    }

    await app?.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
