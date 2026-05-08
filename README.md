# Carer Vista Pro

Next.js 15 + Supabase PWA for caregiver coordination.
Installs as an Android app via Bubblewrap, as a PWA on iPhone via Safari.

## First-time setup

### 1. Install Node.js (skip if you already have it)

Make sure you have Node 20 or newer:
```
node --version
```
If not, install from https://nodejs.org (LTS version).

### 2. Install dependencies

From inside this folder:
```
npm install
```

### 3. Configure Supabase credentials

Copy the example env file:
```
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values from
**Supabase Dashboard → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` → "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → "Project API keys" → `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` → service role key, server-only

### 4. Run the dev server

```
npm run dev
```

Open http://localhost:3000

You should be redirected to `/login`. Create the first account, confirm email if
required by your Supabase Auth settings, then complete `/setup` to create a blank
organization, owner/admin profile, first care recipient, and optional invitations.

If that works, the entire stack is correctly wired up.

## Public deployment notes

- Do not commit `.env.local`, service-role keys, screenshots with real data, or
  private Supabase project references.
- Use a new Supabase project for public deployments.
- Apply the full base schema and migrations before releasing. This repository's
  current migration folder includes incremental migrations plus public onboarding
  fields, but it may still need a complete baseline schema export for a new blank
  Supabase project.
- Terms, Privacy Policy, Emergency Disclaimer, and Data Deletion links are exposed
  from Help. Replace the placeholder legal copy before production release.

## What's in this app

- Next.js 15 (App Router) + React 19 + TypeScript
- Supabase auth via @supabase/ssr (cookie-based sessions)
- Middleware that refreshes sessions and protects routes
- Login page (email + password)
- First-run setup flow for new public deployments
- Sign-out flow
- Tailwind CSS 3 with custom theme:
  - Fraunces (serif) for display headings
  - Manrope for body text
  - Warm cream / forest green / terracotta palette
- PWA manifest (ready for icon files)

## Folder structure

```
src/
  app/
    layout.tsx            # Root layout, fonts
    page.tsx              # Redirect to /home
    globals.css           # Tailwind + base styles
    login/page.tsx        # Sign-in page
    setup/page.tsx        # First-run setup
    auth/callback/route.ts # OAuth/magic link callback
  lib/
    supabase/
      client.ts           # Browser client
      server.ts           # Server client (uses cookies)
  middleware.ts           # Session refresh + route protection
public/
  manifest.json           # PWA manifest
```
