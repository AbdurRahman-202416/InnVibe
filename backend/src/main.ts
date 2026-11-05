// Load backend/.env first (on Vercel the variable comes from project settings)
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Entry point of the API, used locally (npm run start:dev) and by Vercel's zero-config NestJS support */
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
