# InnVibe Frontend (Next.js 15 + Tailwind v4)

The public guest website and the login-protected staff portal, in one Next.js App Router app on `http://localhost:3000`. It needs the API from `../backend` running.

## Setup

```bash
cd frontend
npm install
npm run dev        # next dev on :3000
npm run build      # production build (also type-checks)
```

`frontend/.env.local` (optional locally, the default is the same):

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_API_URL` is the only setting: the API address, no trailing slash. It is read in one place (`lib/api.ts`) and baked in at build time, so redeploy after changing it.

## Deploy (Vercel)

Separate Vercel project with root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the deployed API URL. Steps are in the root README.

## Routes

| Area | Route | Page |
| ---- | ----- | ---- |
| Guest | `/` | Landing: search, room types, facilities, newsletter, FAQ |
| | `/rooms` | Search results for the chosen dates |
| | `/rooms/<number>` | Room details, availability and price for the stay |
| | `/book` | Checkout (card / bKash / Nagad) with inline validation |
| | `/confirmation/<code>` | Confirmation (shows a cancelled state too) |
| | `/manage` | "My booking": one box for confirmation code, e-mail or mobile number |
| | `/feedback` | Guest feedback form |
| Staff | `/admin/login` | Sign in |
| | `/admin` | Dashboard |
| | `/admin/rooms` | Rooms and tonight's status |
| | `/admin/bookings` | Search, filters, details, cancel with reason, new booking |
| | `/admin/feedback` | Guest feedback (read-only) |
| | `/admin/subscribers` | Newsletter sign-ups, CSV export |

## Special pages

| File | When it shows |
| ---- | ------------- |
| `app/not-found.tsx` | Any URL with no matching route (global 404, standalone page) |
| `app/(guest)/not-found.tsx` | Guest page called `notFound()` (unknown room or booking); header and footer stay |
| `app/(guest)/loading.tsx`, `app/admin/(portal)/loading.tsx` | Spinner (`components/PageLoader.tsx`) while a server page loads |
| `app/(guest)/error.tsx`, `app/admin/(portal)/error.tsx` | "Something went wrong" with a Try again button (`components/ErrorState.tsx`) |

Note: because the route groups have a `loading.tsx`, a missing room or booking is streamed, so its HTTP status is `200` even though the 404 page (with `noindex`) is rendered.

## Structure

```
src/
  middleware.ts          gate for /admin/* (no cookie -> /admin/login)
  app/layout.tsx         <html>, fonts (Playfair, Karla, Noto Sans Bengali for the ৳ sign)
  app/(guest)/           public website layout and pages
  app/admin/login/       login page + server actions
  app/admin/(portal)/    staff pages behind login (sidebar layout)
  app/api/staff/         same-origin route handlers that add the token from the cookie
  components/            Modal, BookingModal, Sidebar, PageLoader, ErrorState ...
  components/guest/      header, footer, hero, search, checkout, feedback form ...
  components/admin/      search box, filters, badges, booking details / cancel modal
  components/ui/         DatePicker, Select, useDismiss, usePopoverPosition
  lib/                   api.ts (public API), staff-server.ts, staff-client.ts, types.ts, format.ts
public/images            Unsplash photos (see ../IMAGE_CREDITS.md)
```

## How it works

- **Guest search lives in the URL** (`?checkIn&checkOut&guests`), submitted by plain GET forms and rendered by server components (`force-dynamic`). Pages re-ask the API for availability and prices instead of trusting URL values.
- **Staff session**: the login server action stores the API token in an httpOnly cookie. `middleware.ts` redirects without it, the portal layout validates it with `/auth/me`, and client components call `app/api/staff/*` so the browser never sees the token. The API rejects unauthenticated requests anyway.
- **Custom controls**: `DatePicker` and `Select` render their popovers in a portal with `position: fixed`, so a scrolling modal cannot clip them. `Modal` also uses a portal.
- **Money** is shown with `formatCurrency` (`৳`, lakh grouping, `en-IN`); prices always come from the API.
- **Design conventions**: tokens in `globals.css` (`@theme`), inputs and buttons `rounded-md`, large cards `rounded-lg`, touch targets `min-h-11`, inline validation with a red border and a one-line message.
