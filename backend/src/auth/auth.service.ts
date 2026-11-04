import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { authSecret } from '../common/config';
import { StaffUserDocument, StaffUserEntity } from './user.schema';

export interface StaffUser {
  username: string;
  name: string;
  role: 'admin' | 'receptionist';
}

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // a staff shift
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;

/** Accounts created the first time the API starts (only if they do not exist yet). */
const DEFAULT_ACCOUNTS: { username: string; name: string; role: StaffUser['role']; password: string }[] = [
  { username: 'admin', name: 'Hotel Manager', role: 'admin', password: 'InnVibe@2026' },
  { username: 'frontdesk', name: 'Front Desk', role: 'receptionist', password: 'Welcome@2026' },
];

/**
 * Staff authentication, with no external auth library so every step can be explained:
 *  - staff accounts live in MongoDB; passwords are stored as scrypt hashes with a per-user salt
 *    and compared in constant time
 *  - login returns a signed token: base64url(payload) + "." + HMAC-SHA256(payload, secret)
 *  - the token carries an expiry; verification recomputes the signature, so it cannot be forged or edited
 *  - the account must still exist in the database, so deleting a user also revokes their token
 *  - 5 wrong passwords lock that username for a minute (basic brute-force protection, kept in memory)
 *
 * A real app would add HTTPS, 2FA and a proper session/JWT library.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly secret = authSecret();
  private readonly failures = new Map<string, { count: number; lockedUntil: number }>();

  constructor(@InjectModel(StaffUserEntity.name) private readonly userModel: Model<StaffUserDocument>) {}

  /** Create the default staff accounts that are missing. Existing accounts (and their passwords) are never touched. */
  async onModuleInit(): Promise<void> {
    for (const account of DEFAULT_ACCOUNTS) {
      if (await this.userModel.exists({ username: account.username })) continue;
      const salt = randomBytes(16).toString('hex');
      await this.userModel.create({
        username: account.username,
        name: account.name,
        role: account.role,
        salt,
        hash: scryptSync(account.password, salt, 32).toString('hex'),
      });
      this.logger.log(`Created staff account "${account.username}"`);
    }
  }

  /** Check credentials and return a token plus the public user info. */
  async login(username?: unknown, password?: unknown): Promise<{ token: string; user: StaffUser }> {
    // Anything that is not text cannot be a valid login. Same message as a wrong password.
    if ((username !== undefined && typeof username !== 'string') || (password !== undefined && typeof password !== 'string')) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const name = (username ?? '').trim().toLowerCase();
    const attempt = this.failures.get(name);
    if (attempt && attempt.lockedUntil > Date.now()) {
      throw new HttpException('Too many failed attempts. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = name ? await this.userModel.findOne({ username: name }).lean() : null;
    // Always hash, even for unknown users, so response time does not reveal which usernames exist.
    const candidate = scryptSync(password ?? '', user?.salt ?? 'unknown-user-salt', 32);
    const isValid = user !== null && timingSafeEqual(candidate, Buffer.from(user.hash, 'hex'));

    if (!isValid) {
      const count = (attempt?.count ?? 0) + 1;
      this.failures.set(name, {
        count,
        lockedUntil: count >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCK_MS : 0,
      });
      // Same message for "no such user" and "wrong password".
      throw new UnauthorizedException('Invalid username or password');
    }

    this.failures.delete(name);
    const publicUser: StaffUser = { username: user.username, name: user.name, role: user.role };
    return { token: this.sign(publicUser), user: publicUser };
  }

  /** Read "Bearer <token>" from the Authorization header and return the staff user, or throw 401. */
  async requireStaff(authorization?: string): Promise<StaffUser> {
    const token = /^Bearer (.+)$/.exec(authorization ?? '')?.[1];
    const user = token ? await this.verify(token) : null;
    if (!user) throw new UnauthorizedException('Please sign in');
    return user;
  }

  private sign(user: StaffUser): string {
    const body = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
    return `${body}.${this.signature(body)}`;
  }

  private async verify(token: string): Promise<StaffUser | null> {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expected = Buffer.from(this.signature(body));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StaffUser & { exp: number };
      if (payload.exp < Date.now()) return null;
      // The account must still exist (so removing a user also revokes their token).
      const user = await this.userModel.findOne({ username: payload.username }).lean();
      return user ? { username: user.username, name: user.name, role: user.role } : null;
    } catch {
      return null;
    }
  }

  private signature(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}
