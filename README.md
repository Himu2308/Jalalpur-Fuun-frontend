# Jalalpur Fun Ticketing — Frontend

Next.js (App Router, plain JS) mobile-friendly customer + staff web app.

## Setup

1. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_API_URL` (the backend URL) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same Google OAuth client id used in the backend).
2. `npm install`
3. `npm run dev` — open http://localhost:3000

## Pages

- `/login` — Google sign-in + one-time phone number capture
- `/` — home page: browse activities, add to a multi-game cart
- `/checkout` — cart summary + Razorpay payment
- `/tickets/[bookingId]` — swipeable QR codes, one per person per game, for a paid booking
- `/my-tickets` — list of the logged-in customer's bookings
- `/staff/login` — worker login (UID only, no password); once logged in, the same page shows the camera QR scanner for that worker's assigned activity
- `/admin` — password-gated (the shared admin password, no individual accounts): create/list workers, force-logout a worker's sessions, scan and validate a ticket for *any* activity, and view the recent scan log

## Notes

- Auth sessions are stored in `localStorage` (`userToken`/`user` for customers, `workerToken`/`worker` for workers, `adminToken` for the shared admin session) — simple by design, matches the backend's stateless JWT approach.
- The cart persists in `localStorage` between the home page and checkout.
- QR codes are rendered from `qrcode.react` and scanned with `html5-qrcode` (loaded dynamically, camera access required).
