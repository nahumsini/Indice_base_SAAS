import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/filters/api-error.filter';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 256 * 1024 }),
    { bufferLogs: true },
  );
  const config = app.get(AppConfigService);

  await app.register(fastifyHelmet);
  await app.register(fastifyCookie);
  app.enableCors({
    origin: config.frontendOrigin,
    credentials: true,
  });
  app.useGlobalFilters(new ApiErrorFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(config.port, '127.0.0.1');
  console.log(`Demo Indice backend listening on http://127.0.0.1:${config.port}`);
}

void bootstrap();
