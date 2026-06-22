# Web SaaS — Milestone 1: accounts (Supabase auth)

This adds **web-only** sign-up/login on top of the existing app, without touching the
desktop build. It's fully client-side (no Next middleware/API routes) so the desktop
**static export keeps working**.

## What was added
- `lib/webmode.ts` — `WEB_MODE` flag (`NEXT_PUBLIC_WEB_MODE=1`), web build only.
- `lib/supabase.ts` — guarded browser Supabase client (returns `null` when env unset → desktop unaffected).
- `components/AuthProvider.tsx` — session context: `useAuth()` → `{ user, session, signIn, signUp, signOut, ready, configured }`.
- `components/AuthGate.tsx` — on the web build, shows a login panel until signed in, then an account bar + the app. Passthrough on desktop / when Supabase isn't configured.
- `app/layout.tsx` — wraps `<Shell>` content in `AuthProvider` + `AuthGate`.
- `supabase/schema.sql` — `profiles` table (id, email, **plan**, **addons**, stripe_customer_id) + RLS + auto-create-on-signup trigger.
- `.env.example` — the env vars.

## One-time setup
1. Create a free project at https://supabase.com.
2. SQL editor → paste & run `supabase/schema.sql`.
3. Auth → Providers: keep **Email** enabled. (Email confirmation on = users must confirm before first sign-in; off = instant.)
4. Copy **Project URL** + **anon key** (Project Settings → API).
5. Make `.env.local` from `.env.example` and fill:
   ```
   NEXT_PUBLIC_WEB_MODE=1
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
6. `npm install` (pulls `@supabase/supabase-js`), then `npm run dev`.

## Behaviour
- **Web build** (`NEXT_PUBLIC_WEB_MODE=1` + Supabase env): visitors see a sign-in / sign-up
  panel; after auth the studio appears with a "Signed in as … / Sign out" bar. Each user
  gets a `profiles` row (default `plan='free'`). RLS means a user can only read/update their
  own row — they **cannot** self-upgrade their plan (that's written server-side in Milestone 2).
- **Desktop build** (`BUILD_STATIC=1`, no web env): `WEB_MODE=false`, Supabase client is
  `null`, AuthGate is a passthrough → identical to today, no login.

## Not in this milestone (next)
- **M2:** Stripe tiers + à-la-carte (NSFW) via a **Supabase Edge Function** webhook that writes
  `plan`/`addons` into `profiles` (keeps the Next app static).
- **M3:** entitlements — map plan/addons → which models + features are shown in the studios.
