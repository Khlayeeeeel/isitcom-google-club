# ISITCOM Google Club

React/Vite implementation of the ISITCOM Google Club website. The original single-file prototype is preserved in `prototype.html` for visual reference.

## Run locally

```bash
pnpm install
pnpm dev
```

## Production build

```bash
pnpm build
pnpm preview
```

## Secure registration form setup

The registration form is public and does not use accounts, login or CAPTCHA. The browser calls a tightly restricted Supabase RPC that validates every field, applies IP and email rate limits, and is the only public database operation.

Add these two variables in Vercel for Production and Preview:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

The publishable key is designed for browser use. Never use a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable. Redeploy after adding or changing Vercel environment variables.

Run `supabase/migrations/20261027122000_simplify_public_registration.sql` in the Supabase SQL editor, then redeploy the site.

## Project structure

- `src/data.js` — editable club content, events, departments, team and statistics
- `src/components/Layout.jsx` — loader, navigation, theme UI and progress navigation
- `src/components/Sections.jsx` — hero, story, departments, team, events and gallery
- `src/components/JoinForm.jsx` — form state, validation and success animation
- `src/useSiteMotion.js` — GSAP, ScrollTrigger, Lenis and interaction lifecycle
- `src/styles.css` — the preserved visual system and responsive styling
- `assets/igc.png` — supplied club logo
