import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Worker doesn't need to listen on HTTP by default.
  await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
}
void bootstrap();
