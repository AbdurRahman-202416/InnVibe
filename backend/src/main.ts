// Load backend/.env (MONGODB_URI etc.) before anything else reads process.env.
import 'dotenv/config';
import { createApp } from './app.factory';

/** Local / Node-host entry point. On Vercel the app is started by api/index.js instead. */
async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`InnVibe API running on http://localhost:${port}`);
}

bootstrap();
