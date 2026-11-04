# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

InnVibe is a hotel app built for portfolio/interview presentations: a NestJS API (`backend/`, MongoDB Atlas via Mongoose, port 4000) and a Next.js 15 App Router + Tailwind v4 frontend (`frontend/`, port 3000) containing both a public guest website and a login-protected staff portal. Deployment: backend and frontend are separate Vercel projects (`backend/vercel.json` + `api/index.js` run the compiled app; `src/app.factory.ts` is shared with `main.ts`). The only environment variables are `MONGODB_URI` (backend, with the database name in it; token key and db name are derived in `common/config.ts`, CORS is open) and `NEXT_PUBLIC_API_URL` (frontend). Do not add more env vars. `README.md` has the full route/API tables and interview talking points; keep it in sync when behaviour changes. The owner is a Banglish speaker and prefers simple, explainable code with comments. **The UI must read like a real live hotel site: never write "demo", "dummy", "test", "simulated" or placeholder-looking contact details in user-visible text** (code comments and README may be honest about it).

## Commands

There is no test runner and no linter configured. Verify with a typecheck and a production build.

```bash
# backend (cd backend)
npm run start:dev          # nest --watch on :4000; needs backend/.env with MONGODB_URI
npm run build              # nest build -> dist/
npx tsc --noEmit           # typecheck

# frontend (cd frontend)
npm run dev                # next dev on :3000
npm run build              # next build (runs type + lint checks)
npx tsc --noEmit
```

`frontend/.env.local` only sets `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). `backend/.env` (git-ignored, loaded by `dotenv` in `main.ts`) only holds **`MONGODB_URI`** (required; put the database name after the host, e.g. `.../innvibe`). Starting staff logins: `admin / InnVibe@2026`, `frontdesk / Welcome@2026`.

The owner usually has their own `nest start --watch` and `next dev` running. Do not `pkill` them, and do not run `next build` inside `frontend/` (it overwrites the `.next` their dev server uses). To verify a production build, copy the folder (excluding `node_modules`/`.next`) somewhere else, symlink `node_modules`, and build there.

## Architecture

### Backend (`backend/src`)
- MongoDB Atlas is the database (collections `rooms`, `bookings`, `roomnights`, `staffusers`, `subscribers`). Services use Mongoose models (`*.schema.ts`) and every service method is `async`. On first start against an empty DB, `onModuleInit` hooks seed rooms (`rooms.seed.ts`), the two staff accounts and 3 sample bookings; later starts never re-seed. API ids are unchanged except `booking.id` is the Mongo `_id` as a string.
- **Availability is never stored.** `RoomsService` is only the room catalogue. `BookingsService.isRoomFree` does the date-range overlap check (`a.in < b.out && b.in < a.out`, check-out day exclusive, as a Mongo query), and `GET /bookings/availability` returns every room with a computed `isAvailable`. Double-booking is prevented by the `roomnights` collection (unique index on room+night): `create()` reserves the nights first, then charges, then saves, and releases the nights if anything fails. The guest search, room detail page, checkout re-check and staff dashboard all depend on this one rule.
- **All money is calculated server-side** in `bookings/pricing.ts` (BDT: rate x nights + 10% service charge + 15% VAT on rate+service, whole taka). The frontend only displays values from `GET /bookings/quote` or the booking record.
- `POST /bookings` is dual-purpose: with a `payment` object it is a public guest booking (charged through the dummy `PaymentsService` only after every other rule passed); without one it is a front-desk booking and requires a staff token (`AuthService.requireStaff`). `GET /bookings` is staff-only. Fixed-path GET routes (`availability`, `quote`) must stay declared before `:code`.
- `PaymentsService` is a test gateway: it only length-checks the details (card 16 digits + MM/YY + CVC 3-4, wallet number 11 digits + PIN 5) and approves anything that passes; no decline or expiry rules. Only last 4 digits and a generated reference are stored.
- **Cancellation**: `POST /bookings/:code/cancel` (staff) sets `status: cancelled` + reason/by/at (private fields only in the staff list), then deletes that booking's `roomnights`; every availability/overlap query filters `status: {$ne: 'cancelled'}`. Dashboard revenue and counts exclude cancelled bookings.
- **Reviews** (`reviews/`): public POST proven with booking code + e-mail via `BookingsService.lookup`, one per booking (unique `bookingCode`), staff GET only; there are deliberately no update/delete routes.
- All JSON/query text goes through `common/validation.ts` (`assertText`, `escapeRegex`): wrong types give 400 instead of 500, and search text is regex-escaped before it reaches MongoDB.
- `auth/`: hand-rolled, no libraries. Staff users live in `staffusers` (token verification checks the user still exists); scrypt password hashes, HMAC-SHA256 signed 8h token (`base64url(payload).signature`), 5 failed logins lock a username for 60s (429), `AuthGuard` for routes.

`npm run seed:sample` (in `backend/`) writes realistic bookings/reviews/subscribers straight to MongoDB (idempotent; it is the only way to get past-dated stays because the API rejects them).

### Frontend (`frontend/src`)
- Route groups: `app/(guest)/` (public site: landing, `rooms`, `rooms/[roomNumber]`, `book`, `confirmation/[code]`, `manage`) and `app/admin/` (`login/` plus `(portal)/` for the sidebar pages). Root `layout.tsx` only holds `<html>`, fonts and CSS; each group has its own layout.
- Guest search state lives in the URL (`?checkIn&checkOut&guests`), submitted by plain GET forms and rendered by server components (`export const dynamic = 'force-dynamic'`); params are sanitised with `isIsoDate` and defaults in each page. Detail, results and checkout pages all re-ask the API for availability/quotes rather than trusting params.
- **Staff auth flow** (spans several files): `admin/login/actions.ts` (server action) calls the API and stores the token in an httpOnly cookie (`lib/staff-constants.ts`). `middleware.ts` redirects `/admin/*` without a cookie; `admin/(portal)/layout.tsx` validates the token via `/auth/me`; server components use `lib/staff-server.ts`; client components never see the token and call same-origin `app/api/staff/*` route handlers (`proxyToApi`) through `lib/staff-client.ts`. The API itself still rejects unauthenticated requests.
- Public API calls go through `lib/api.ts`; types mirrored in `lib/types.ts` must be kept in step with the backend interfaces.
- Custom controls instead of native ones: `components/ui/DatePicker.tsx` and `Select.tsx` (keyboard accessible, hidden input so GET forms still work). Their popovers are portaled to `document.body` and placed with `position: fixed` by `usePopoverPosition` (opens on the side with more room, height capped, follows scrolling), so a scrolling modal body can never clip them; `useDismiss` takes both the trigger wrapper and the popover ref for outside-click/Escape. `components/BookingModal.tsx` (staff front-desk booking) is a fixed-header / scrolling-body / fixed-footer dialog with a live summary column. `components/Modal.tsx` renders through a portal into `document.body`; modals rendered inside sticky parents otherwise sit under sticky headers.
- Special pages: global `app/not-found.tsx`, plus `loading.tsx` (shared `PageLoader`) and `error.tsx` (shared `ErrorState`) in `(guest)` and `admin/(portal)`; `(guest)/not-found.tsx` handles `notFound()` calls. READMEs exist at root, `backend/` and `frontend/`; keep all three in sync.
- Money formatting: `formatCurrency` outputs `৳` with lakh grouping (`en-IN`); Playfair/Karla lack the glyph, so `Noto Sans Bengali` is a fallback font in the `--font-display`/`--font-sans` stacks (`layout.tsx`, `globals.css`).
- Design tokens are in `globals.css` `@theme` (paper/ink/navy/gold/line...). Conventions: inputs/buttons `rounded-md`, large cards/panels `rounded-lg` with `overflow-hidden` when they contain images, bottom-sheet modals round only the top corners on phones, touch targets `min-h-11`.
- Photos are Unsplash downloads in `public/images` (credits in `IMAGE_CREDITS.md`); each room's `image`/`gallery` paths are defined in `backend/src/rooms/rooms.service.ts`.
