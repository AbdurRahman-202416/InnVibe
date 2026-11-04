# InnVibe: Hotel App (guest website + secured staff portal)

NestJS API + **MongoDB Atlas** (Mongoose) + Next.js 15 (App Router) + Tailwind CSS v4. Prices are in Bangladeshi taka (৳).

Each half has its own README with details:

- [`backend/README.md`](backend/README.md): API, database, auth, booking rules, scripts
- [`frontend/README.md`](frontend/README.md): routes, components, staff login flow, loading / 404 / error pages

Two front ends share one API:

| Who       | URL                       | What they do                                                         |
| --------- | ------------------------- | -------------------------------------------------------------------- |
| **Guest** | `/`                       | Landing page: search, room types, why book direct, facilities, newsletter, FAQ |
|           | `/rooms`                  | Search results: room types free for those dates, all-in prices       |
|           | `/rooms/<number>`         | Room detail: photos, size/bed/view, amenities, availability + all-in price for chosen dates |
|           | `/book`                   | Checkout: details, **dummy** payment (card / bKash / Nagad), popups  |
|           | `/confirmation/IV-XXXXXX` | Booking confirmation with price breakdown, found by code             |
|           | `/manage`                 | "My booking": find a reservation with a code, e-mail or mobile number                  |
|           | `/feedback`               | Guest feedback (praise / suggestion / complaint) tied to a booking   |
| **Staff** | `/admin/login`            | Sign in (everything under `/admin` needs a session)                  |
|           | `/admin`                  | Dashboard (rooms, active bookings, revenue, occupancy)               |
|           | `/admin/rooms`            | Every room and whether it is free tonight                            |
|           | `/admin/bookings`         | Search (code, name, e-mail, phone, room), filters, details, **cancel with a reason**, "New booking" |
|           | `/admin/feedback`         | Guest feedback, read-only: summary, rating bars, filters             |
|           | `/admin/subscribers`      | Newsletter sign-ups with search and CSV export                       |

## Database (MongoDB Atlas)

1. Create a free cluster in MongoDB Atlas, add a **database user** (username + password) and allow your IP under **Network Access**.
2. In Atlas: *Connect -> Drivers* and copy the connection string.
3. Create `backend/.env` with one line, the string with your password in it (URL-encode special characters) and the database name after the host:

   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/innvibe
   ```

   That is the only backend setting. If the string has no database name, `innvibe` is used.

On the first start against an empty database the API writes the starting data once: the 20 rooms, the two staff accounts
and 3 sample bookings. After that the database is the source of truth and data survives restarts.
Collections: `rooms`, `bookings`, `roomnights`, `staffusers`, `subscribers`.

## Run it

Open two terminals.

```bash
# Terminal 1: API on http://localhost:4000 (needs backend/.env, see above)
cd backend
npm install
npm run start:dev

# Terminal 2: UI on http://localhost:3000
cd frontend
npm install
npm run dev
```

The frontend reads the API address from `frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:4000`, which is also the default, so locally the file is optional).
Data lives in MongoDB. The sample bookings are only written on the very first start, so their dates are relative to that day.

### Demo accounts (staff portal)

| Username    | Password       | Role         |
| ----------- | -------------- | ------------ |
| `admin`     | `InnVibe@2026` | admin        |
| `frontdesk` | `Welcome@2026` | receptionist |

Staff accounts are stored in the `staffusers` collection (scrypt hash + salt, never the password). They are created on first start with the passwords above;
there is no setting for them, so change the passwords in the database if the site is public. Staff tokens are signed with a key derived from `MONGODB_URI`, so no separate secret is needed.

### Payments

Payments are length-checked only: any 16-digit card number + MM/YY expiry + 3-4 digit CVC, or any 11-digit bKash/Nagad number + 5-digit PIN, is approved.
There are no decline rules, no expiry-date check, and the checkout shows no test hints.

### Sample data

`cd backend && npm run seed:sample` adds realistic data (34 bookings: completed, in-house, upcoming and cancelled, 9 reviews, 24 newsletter
subscribers). It is idempotent (fixed confirmation codes, skips what exists) and keeps the `roomnights` collection consistent.
The catalogue has 20 rooms (5 single, 7 double, 5 deluxe, 3 suite); on start the API adds any catalogue room missing from the database.

### Try the guest flow

1. Open `http://localhost:3000`, keep the default dates, press **Check availability**.
2. Press **Reserve** on a room. Open **Price details** and **Cancellation policy** (popups).
3. Pick **bKash** (or Card / Nagad), fill the details (any valid-length numbers), tick the terms box and **Pay**.
   A progress popup runs, then you land on the confirmation page.
4. Wrong lengths (e.g. a 15-digit card, a 4-digit PIN) are rejected with a clear message and the form keeps your data.
5. Sign in to the staff portal and see the booking with source "Website".

## API

| Method | Route                                          | Access | What it does                                              |
| ------ | ---------------------------------------------- | ------ | --------------------------------------------------------- |
| POST   | `/auth/login`                                  | public | `{ username, password }` -> `{ token, user }`             |
| GET    | `/auth/me`                                     | staff  | The signed-in user                                        |
| GET    | `/rooms`                                       | public | Room catalogue (type, rate, capacity, photo, amenities)   |
| GET    | `/bookings/availability?checkIn=&checkOut=`    | public | Every room with `isAvailable` for that stay (no dates = tonight) |
| GET    | `/bookings/quote?roomNumber=&checkIn=&checkOut=` | public | Price breakdown: rate x nights, service charge, VAT, total |
| GET    | `/bookings/:code`                              | public | One booking by confirmation code                          |
| POST   | `/bookings/lookup`                             | public | `{ query }` (code, e-mail or mobile number) -> matching bookings ("My booking") |
| POST   | `/newsletter`                                  | public | `{ email }` -> subscribe (validated, de-duplicated)       |
| POST   | `/bookings`                                    | public with `payment`, **staff** without | Create a booking          |
| GET    | `/bookings?q=&source=&when=&status=`           | staff  | Bookings with guest details; filters are optional         |
| POST   | `/bookings/:code/cancel`                       | staff  | `{ reason }` cancels (kept, status `cancelled`) and frees the room |
| POST   | `/reviews`                                     | public | `{ code, email, rating, category, message }`, one per booking |
| GET    | `/reviews?q=&category=&rating=`                | staff  | Feedback + overall summary (no edit/delete routes exist)  |
| GET    | `/newsletter?q=`                               | staff  | Newsletter sign-ups                                       |

Booking rules (all in `bookings.service.ts`):

1. required fields, valid dates, check-out at least one day after check-in, check-in not in the past
2. room must exist (404) and sleep that many guests (400)
3. room must be **free for the whole stay**: two stays overlap when `a.in < b.out && b.in < a.out`.
   Check-out day is exclusive, so a guest can arrive the day another one leaves
4. price is calculated by the server (`pricing.ts`): `rate x nights`, + **10% service charge**, + **15% VAT**
   on (rate + service charge), rounded to whole taka
5. if `payment` is present, `PaymentsService` "charges" it (dummy gateway) only after steps 1-4 passed.
   A booking without `payment` is a front-desk booking and needs a staff token

Availability is **never stored** on a room. It is calculated from the bookings.

**No double booking, even under load.** The overlap check gives a friendly early answer, but the real guarantee is the `roomnights` collection:
one document per room per night with a **unique index** on `(roomNumber, date)`. A booking first inserts its nights (the database refuses a
second guest for the same night), then takes payment, then saves the booking; if anything fails the nights are released.
Tested with 8 simultaneous requests for the same room: exactly one succeeds.

### Dummy payment

`payments.service.ts` only checks lengths (card: 16 digits + MM/YY + 3-4 digit CVC; bKash/Nagad: 11-digit number + 5-digit PIN) and approves anything that passes.
Nothing is charged, and only the last 4 digits and a fake reference are kept (never the full card, number or PIN).

## Cancelling a booking

Bookings are never deleted. Staff open **Bookings -> View -> Cancel this booking**, choose or type a reason (3-300 characters) and confirm.
The booking stays in the list as *Cancelled* (with who, when and why; the reason is staff-only), its nights in `roomnights` are released and
availability ignores cancelled bookings, so the room can be booked again immediately. Two staff cancelling at the same moment: exactly one wins
(conditional update). A stay that has already finished cannot be cancelled. The app does not move money: refund online payments separately.

## How staff login works (explain this in an interview)

```
browser --form--> Next server action (loginAction) --POST /auth/login--> NestJS
                       |                                                   |
                       | <------------- signed token (HMAC-SHA256) --------+
                       v
            Set-Cookie: innvibe_staff=<token>; HttpOnly; SameSite=Lax; (Secure in production)
```

- **Passwords** are stored as scrypt hashes with a per-user salt, compared in constant time.
  Wrong user and wrong password give the same message and take the same time.
- **Token** = `base64url(payload).HMAC(payload, key derived from MONGODB_URI)`; payload has user + 8 hour expiry.
  Editing the payload breaks the signature, so it cannot be forged (checked with curl).
- **Cookie is httpOnly**: browser JavaScript cannot read it, so an XSS bug cannot steal the session.
  The browser never calls the API with the token. Client components call our own `/api/staff/*`
  route handlers, which read the cookie on the server and add the `Authorization: Bearer` header.
- **Three layers of protection** (defence in depth):
  1. `middleware.ts`: no cookie on `/admin/*` -> redirect to `/admin/login?next=...`
  2. `admin/(portal)/layout.tsx`: asks `/auth/me` whether the token is really valid (expired/forged -> login)
  3. the API itself: `@UseGuards(AuthGuard)` and `requireStaff()` reject every staff request without a valid token.
     So even someone who skips the frontend gets `401` (`curl localhost:4000/bookings` -> 401)
- **Brute-force**: 5 wrong passwords lock that username for 1 minute (`429`).
- **Open redirect**: the `next` parameter is only accepted if it starts with `/admin`.
- Sign out deletes the cookie.

## Structure

```
backend/                       NestJS API (see backend/README.md)
  src/auth, rooms, bookings, reviews, newsletter, common
  scripts/seed-sample-data.js  realistic sample data (npm run seed:sample)
frontend/                      Next.js app (see frontend/README.md)
  src/app/(guest)              public website
  src/app/admin                login + staff portal
  src/app/api/staff            same-origin proxy that adds the token from the cookie
  src/components, src/lib      UI components, API client, types, formatting
  public/images                Unsplash photos (see IMAGE_CREDITS.md)
```

## Deploying to Vercel (two separate projects)

The API and the website are deployed independently, and each needs exactly one setting. There are no ports in the code, so nothing changes between local and Vercel.

**1. MongoDB Atlas:** Network Access -> allow `0.0.0.0/0` (Vercel has no fixed IP).

**2. Backend project** (Vercel -> Add New -> Project -> import the repo -> **Root Directory: `backend`**)

| Environment variable | Value |
| -------------------- | ----- |
| `MONGODB_URI` | Atlas connection string, ending with the database name, e.g. `.../innvibe` |

Vercel detects NestJS by itself and uses `src/main.ts` as the entry point (no `vercel.json` needed). Open `https://<backend>.vercel.app/rooms` to check it returns the room list.

**3. Frontend project** (a second Vercel project, **Root Directory: `frontend`**, Next.js is detected)

| Environment variable | Value |
| -------------------- | ----- |
| `NEXT_PUBLIC_API_URL` | the backend URL from step 2, no trailing slash |

`NEXT_PUBLIC_*` values are baked in at build time: after changing it, **redeploy** the frontend.

The API accepts browser calls from any website (CORS is open) because staff routes need a token in the `Authorization` header, so there is no
"allowed origin" to configure. The staff cookie is set by the frontend itself (HTTPS, `Secure`), so it works on any domain.

Notes: the first request after idle is slower (cold start + Atlas connection); the sign-in lockout counter lives in memory per instance, so on
serverless it is best-effort; `npm run seed:sample` still runs from your computer against Atlas.

## Loading, 404 and error pages

- **404**: `app/not-found.tsx` is the global page for any URL that matches no route. `app/(guest)/not-found.tsx` is used when a guest page
  calls `notFound()` (unknown room number or confirmation code) and keeps the site header and footer.
- **Loading**: `loading.tsx` in `(guest)` and `admin/(portal)` shows one shared spinner (`components/PageLoader.tsx`) while a server page fetches data.
- **Errors**: `error.tsx` in the same two groups shows a "Something went wrong / Try again" screen instead of a crash.

## Interview talking points

- **Two audiences, one API.** Route groups `(guest)` and `admin/(portal)` have separate layouts. A real hotel system also
  splits a public booking engine from a staff PMS (property management system).
- **Date-based availability.** One overlap rule on the server is used by guest search, checkout re-check and staff dashboard,
  so they can never disagree.
- **Why the MongoDB migration was small.** Controllers and the frontend never knew where data lived; only the services changed (arrays -> Mongoose
  models, methods became `async`). The API shape is the same; the only visible difference is `booking.id` is now MongoDB's `_id` as text.
- **Don't trust the client.** Price is calculated by the API (`/bookings/quote`), the checkout only displays it.
  Availability is re-checked when booking, and the card is charged only after every other rule passed.
- **Bangladesh pricing.** Rate + 10% service charge + 15% VAT, shown as "incl. taxes & fees" in search results and
  itemised in a "Price details" popup, like real booking sites. Taka formatting uses lakh grouping (`৳1,23,456`).
- **Custom DatePicker / Select** instead of the browser's native ones, so they match the design. The popover is as wide as the input, works with the keyboard
  (arrows, PageUp/PageDown, Enter, Escape), disables dates outside min/max and keeps a hidden input so a plain HTML GET form still submits the values.
- **Hero slideshow**: 5 photos cross-fade every 6 s while each slowly zooms in (CSS animation). No controls, decorative (`aria-hidden`),
  the order is shuffled after load so every visit differs without a server/browser HTML mismatch.
- **Room detail page** (`/rooms/202?checkIn=..&checkOut=..&guests=..`) is a server component: it asks the API which rooms are free for the
  stay, so the same URL answers "is THIS room free on these dates and what does it cost?". The date form is a GET form back to the same page, guests are
  capped at the room's capacity, bad or out-of-range params are clamped, an unknown room number gives a real 404.
- **Landing page content** follows what big hotel sites (e.g. Radisson) do, kept simple: search, room types,
  "why book direct" (only real features, no invented discounts), facilities, newsletter, FAQ (native `<details>`, no JS), 4-column footer.
  "My booking" in the header finds a reservation by code, e-mail or mobile number (one shared "not found" message, so it cannot be used to check what exists).
- **Search lives in the URL**, a plain GET form: shareable, back-button friendly, server-rendered.
- **Never store card data.** The dummy gateway keeps only the last 4 digits and a reference.
- **Accessible popups.** `Modal` uses `role="dialog"`, `aria-modal`, Escape to close, focus return, scroll lock, and renders in a
  portal so sticky headers cannot sit above it. The payment-progress popup is deliberately not dismissible.
- **Nest layers:** controller handles HTTP, service holds logic, module wires them; guards add cross-cutting security.

## Known limits (say these before you are asked)

- Tokens are stateless and sign-in lockout counters are kept in memory (they reset on restart, and are per instance on serverless). A real app would use a proper session/JWT library.
- No HTTPS or 2FA locally (the cookie is `Secure` only in production). Lockout is per username, so an attacker could
  lock a real user out for a minute; real systems add per-IP limits.
- Roles are shown but not enforced differently (admin and receptionist can do the same things).
- `GET /bookings/:code` is public because the confirmation page needs it right after payment (anyone with the code can see that booking). "My booking" also finds bookings by e-mail or mobile number alone (exact match, max 10), so anyone who knows a guest's e-mail or number can open their booking. A stricter version would need code + e-mail again, or an e-mailed one-time code.
- Newsletter sign-ups are stored in MongoDB, but there is no unsubscribe or e-mail sending.
- Guests cannot cancel online (staff cancel from the portal); e-mail and SMS are not built, and the cancellation policy popup is informational.
- Feedback can be sent any time after a booking exists (code + e-mail), including before check-in.
- bKash and Nagad are simulated forms, not integrations. Currency is fixed to BDT.
