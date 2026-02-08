import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  const config = app.get(ConfigService);
  await app.listen({
    port: config.get<number>('port') ?? 3000,
    host: config.get<string>('host') ?? '0.0.0.0',
  });
}
void bootstrap();
