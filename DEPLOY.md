# Deploying to Vercel (via GitHub)

This app is a TanStack Start (SSR) + Vite project. It builds to a Nitro server
output that Vercel serves as serverless functions.

## 1. Push to GitHub
Connect the repository to Vercel (New Project → import the GitHub repo).
Vercel detects the build from `vercel.json`.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)
Set these in every environment you deploy:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable/anon key
- `VITE_SUPABASE_URL` — same as `SUPABASE_URL` (exposed to the client bundle)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — same as `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — service_role secret (server-only; needed so
  business admins can create accounts for their team members)

`vercel.json` already sets `NITRO_PRESET=vercel` for the build, and
`vite.config.ts` sets the Nitro preset to `vercel`, so the SSR server deploys as
Vercel serverless functions.

## 3. Database migration (one time)
Run `supabase/migrations/0001_business_portals.sql` once in the Supabase SQL
editor (or via your DB connection). It creates the `businesses`,
`business_members`, and `business_links` tables with row-level security. It is
safe to re-run.

## 4. Auth
Sign-in uses Supabase Auth (email/password + Google OAuth) — no Lovable
dependency. Google OAuth redirect works on Vercel; set the Vercel URL in
Supabase → Authentication → URL Configuration → Redirect URLs.
