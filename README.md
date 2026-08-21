# BERLIN — Haus de Gourmet

A nocturnal editorial website for a rooftop gourmet house and bar. Built to
Design System v1.0: dark architectural surfaces, warm ivory typography,
restrained brass accents, and a day → after-dark journey down the page.

## Stack

- **Astro** (static output) — near-zero JS; ships only the interactivity that
  genuinely needs it, as React islands.
- **React islands** — reserved for the day→night scroll, mobile nav, and menu
  carousel (added in later features).
- **Astro `<Picture>`** — AVIF + WebP + JPG fallback with responsive `srcset`
  and lazy-loading, per the performance rules.
- **Self-hosted variable fonts** — Bodoni Moda (display) + Manrope (UI).

## Commands

```bash
npm install       # install dependencies
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve the production build
npm run scan      # safety scan of STAGED files (run before every commit)
npm run scan:all  # safety scan of the whole repo
```

## Design tokens

All colors, type sizes, spacing, and motion live in `src/styles/tokens.css`.
Sections consume these tokens — they never invent their own values.

## Where media goes

- **Images / photography → `src/assets/<section>/`** — optimized at build
  (AVIF + WebP + `srcset`). Commit the highest-quality original; the build
  handles compression. See [`src/assets/README.md`](src/assets/README.md) for
  the per-section folders and crops.
- **Videos & static files → `public/videos/…`** — served as-is (Astro doesn't
  transcode video). Reference by URL, e.g. `/videos/after-dark-loop.mp4`. See
  [`public/videos/README.md`](public/videos/README.md).

Photography currently uses **free-license placeholders** (Unsplash, no
attribution required), clearly marked with `@swap` comments so the final
art-directed media drops in with no code changes.

## Safety scan

`scripts/safety-scan.mjs` runs before every commit and blocks it if it finds
secrets, credentials, or local filesystem paths. See the file header for the
allowlist mechanism (`.safetyscanignore` / inline `safety-scan-ignore`).

## Structure

```
src/
├── assets/       # optimized-at-build imagery (placeholders for now)
├── components/
│   ├── layout/   # Header (+ Footer, MobileActionBar later)
│   ├── ui/       # Button, SectionLabel, … primitives
│   └── sections/ # Hero (+ Experience, Rooftop, … later)
├── data/site.ts  # brand, nav, public contact details (no secrets)
├── layouts/      # document shell
├── pages/        # index.astro — the single-page journey
└── styles/       # tokens.css + global.css
```
