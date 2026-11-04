// Load backend/.env (MONGODB_URI etc.) before anything else reads process.env.
import 'dotenv/config';
import { createApp } from './app.factory';

/** Entry point, used locally and by Vercel's zero-config NestJS support. */
async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`InnVibe API running on http://localhost:${port}`);
}

bootstrap();
