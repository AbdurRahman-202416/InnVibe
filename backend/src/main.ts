// Load backend/.env (MONGODB_URI) before anything else reads process.env. On Vercel the variable comes from the project settings.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Entry point of the API, used locally (npm run start:dev) and by Vercel's zero-config NestJS support.
 *
 * CORS allows any website to call the API from a browser. That is safe here because staff routes need an
 * Authorization header token (no cookies are used with the API), and the public routes are public anyway.
 * This keeps the deploy free of a CORS setting: the frontend can move to any domain.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`InnVibe API running on http://localhost:${port}`);
}

bootstrap();
