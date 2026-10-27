# ISITCOM Google Club

React/Vite implementation of the ISITCOM Google Club website. The original single-file prototype is preserved in `prototype.html` for visual reference.

## Run locally

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs only the Vite frontend. To test the protected registration API locally, use Vercel's local development command after configuring the environment variables below.

## Production build

```bash
pnpm build
pnpm preview
```

## Secure registration form setup

The registration form is public and does not use accounts or login. Submissions pass through a same-origin Vercel function, which verifies Cloudflare Turnstile before calling a service-only Supabase RPC.

1. Create a Cloudflare Turnstile widget for the production domain.
2. Add these variables in Vercel for Production, Preview and Development as appropriate:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-server-only-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

`SUPABASE_SECRET_KEY` and `TURNSTILE_SECRET_KEY` are server-only secrets. Never prefix either one with `VITE_` or `NEXT_PUBLIC_`. Redeploy after adding or changing environment variables.

The old browser variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are no longer used by the form and can be removed from Vercel after the new variables are configured.

For a no-downtime database cutover:

1. Run `supabase/migrations/20261027120000_harden_club_applications.sql` in the Supabase SQL editor. It adds the new service-only RPC while leaving the currently deployed form working.
2. Deploy this version to Vercel and verify one registration submission.
3. Run `supabase/migrations/20261027121000_disable_legacy_club_application_rpc.sql` to remove the old browser-callable RPC.

## Project structure

- `src/data.js` — editable club content, events, departments, team and statistics
- `src/components/Layout.jsx` — loader, navigation, theme UI and progress navigation
- `src/components/Sections.jsx` — hero, story, departments, team, events and gallery
- `src/components/JoinForm.jsx` — form state, validation and success animation
- `src/useSiteMotion.js` — GSAP, ScrollTrigger, Lenis and interaction lifecycle
- `src/styles.css` — the preserved visual system and responsive styling
- `assets/igc.png` — supplied club logo
