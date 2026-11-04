import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Builds the configured Nest app (used by main.ts).
 *
 * CORS allows any website to call the API from a browser. That is safe here because staff routes need an
 * Authorization header token (no cookies are used with the API), and the public routes are public anyway.
 * This keeps the deploy free of a CORS setting: the frontend can move to any domain.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  return app;
}
