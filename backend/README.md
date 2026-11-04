# InnVibe Backend (NestJS + MongoDB Atlas)

REST API for the InnVibe hotel app on `http://localhost:4000`. Services use Mongoose models; every service method is `async`.

## Setup

```bash
cd backend
npm install
# create backend/.env containing one line (Atlas -> Connect -> Drivers, then add the database name):
# MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/innvibe
npm run start:dev        # nest --watch
```

`backend/.env` is git-ignored: never commit or share it, it holds the database password.

The only setting is **`MONGODB_URI`** (required; the API refuses to start without it). Everything else is fixed or derived:

- database name: the one written after the host in the string (default `innvibe`)
- staff token key: a SHA-256 of the connection string (it contains a private password), see `src/common/config.ts`
- port: `4000` locally (Vercel runs the app as a function, so no port)
- CORS: open to any origin. Safe because staff routes need an `Authorization` token and no cookies are used with the API
- staff passwords: fixed starting values (below), stored hashed in the database

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run start:dev` | Dev server with reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run `dist/main` |
| `npm run seed:sample` | Add realistic bookings, reviews and subscribers straight to MongoDB (idempotent, safe to re-run) |
| `npx tsc --noEmit` | Typecheck (there is no test runner or linter) |

## Deploy (Vercel)

Vercel detects NestJS automatically and runs `src/main.ts`, so no extra config file is needed. Set the root directory to `backend` and add `MONGODB_URI`. Full steps are in the root README.

## Modules

```
src/
  main.ts            dotenv + listen (local)
  app.factory.ts     builds the app + CORS, used by main.ts
  app.module.ts      Mongoose connection + feature modules
  auth/              login, scrypt password hashes, HMAC token, lockout, AuthGuard
  rooms/             room catalogue (20 rooms), seeded on start
  bookings/          rules, availability, pricing, payments, cancel
  reviews/           guest feedback (read-only for staff)
  newsletter/        e-mail sign-ups
  common/validation.ts   assertText, escapeRegex
  common/config.ts       reads MONGODB_URI, derives database name and token key
```

## Collections

| Collection | Notes |
| ---------- | ----- |
| `rooms` | Catalogue only. Missing catalogue rooms are inserted on start. |
| `bookings` | Includes `status` (`confirmed` / `cancelled`) and cancel reason, time and staff user |
| `roomnights` | One document per room per night, **unique index** on `(roomNumber, date)`. This is what prevents double booking. |
| `staffusers` | Username, scrypt hash + salt, role |
| `reviews` | Unique `bookingCode`: one review per booking |
| `subscribers` | Unique e-mail |

First start on an empty database seeds rooms, the two staff accounts and 3 sample bookings. Later starts never re-seed.

## API

| Method | Route | Access | Purpose |
| ------ | ----- | ------ | ------- |
| POST | `/auth/login` | public | `{ username, password }` -> `{ token, user }` |
| GET | `/auth/me` | staff | Signed-in user |
| GET | `/rooms` | public | Room catalogue |
| GET | `/bookings/availability?checkIn=&checkOut=` | public | Every room with computed `isAvailable` |
| GET | `/bookings/quote?roomNumber=&checkIn=&checkOut=` | public | Price breakdown |
| GET | `/bookings/:code` | public | Booking by confirmation code |
| POST | `/bookings/lookup` | public | `{ code, email }` for "My booking" |
| POST | `/bookings` | public with `payment`, staff without | Create a booking |
| GET | `/bookings?q=&source=&when=&status=` | staff | Search and filter bookings |
| POST | `/bookings/:code/cancel` | staff | `{ reason }` (3-300 chars), frees the room |
| POST | `/reviews` | public | `{ code, email, rating, category, message }` |
| GET | `/reviews?q=&category=&rating=` | staff | Feedback and summary |
| POST | `/newsletter` | public | `{ email }` |
| GET | `/newsletter?q=` | staff | Subscribers |

Fixed-path GET routes (`availability`, `quote`) are declared before `:code`.

## Rules worth knowing

- **Availability is computed, never stored.** Two stays overlap when `a.in < b.out && b.in < a.out` (check-out day exclusive); cancelled bookings are ignored.
- **No double booking under load.** `create()` reserves the `roomnights` first, then charges, then saves the booking, and releases the nights if anything fails. 12 simultaneous requests for one room: exactly one succeeds.
- **Money is calculated on the server** (`bookings/pricing.ts`): rate x nights + 10% service charge + 15% VAT on (rate + service charge), whole taka (BDT).
- **Payments are length-checked only** (`payments.service.ts`): card 16 digits + MM/YY + CVC 3-4, bKash/Nagad 11-digit number + 5-digit PIN. No decline rules. Only the last 4 digits and a reference are stored.
- **Cancel**: conditional update, so two staff cancelling at once give one success and one `409`. A stay that already finished cannot be cancelled (`400`). Money is not moved.
- **Reviews**: proven with booking code + e-mail, one per booking (`409` for a second), no update or delete routes.
- **Input hardening**: wrong JSON types and over-long text return `400`, search text is regex-escaped before it reaches MongoDB.

## Staff auth

Password hashes use scrypt with a per-user salt (constant-time compare). The token is `base64url(payload).HMAC-SHA256`, valid 8 hours, and verification also checks the user still exists. Five wrong passwords lock a username for 60 s (`429`, kept in memory). Staff routes are protected by `AuthGuard` or `requireStaff()`.

Starting staff logins (stored hashed; change them in the database for a public site): `admin / InnVibe@2026`, `frontdesk / Welcome@2026`.
