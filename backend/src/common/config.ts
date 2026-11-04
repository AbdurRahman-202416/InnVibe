import { createHash } from 'crypto';

/**
 * The only environment variable the API needs is MONGODB_URI (the Atlas connection string).
 * Everything else is derived from it or fixed in code:
 *  - database name: the part after the host, e.g. mongodb+srv://user:pass@cluster.mongodb.net/innvibe  (default "innvibe")
 *  - token-signing secret: a SHA-256 of the connection string, which already contains a private password
 */
export function mongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to backend/.env (or the Vercel environment variables).');
  }
  return uri;
}

/** Database name written in the connection string, or "innvibe" when the string has none. */
export function mongoDbName(uri: string): string {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : 'innvibe';
}

/** Secret used to sign staff tokens. Stable between restarts and servers because the connection string is the same. */
export function authSecret(): string {
  return createHash('sha256').update(`innvibe-staff-token:${mongoUri()}`).digest('hex');
}
