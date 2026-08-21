# Image assets

Drop **photography here**, in the matching section folder. Everything in
`src/assets/` is **optimized at build** — Astro emits AVIF + WebP + a JPG
fallback with responsive `srcset`, so commit the **highest-quality original
you have** (large, high-res). Do not pre-compress.

Reference an image from a component by importing it, then passing it to
`<Picture>` / `<Image>` (see `src/components/sections/Hero.astro` for the
pattern). Swapping a placeholder for the real shot = drop the file in, update
the one `import` line (look for `@swap` comments).

## Where each shot goes & its crop (System v1.0 §15–17)

| Folder          | Subject                                  | Aspect ratio      |
| --------------- | ---------------------------------------- | ----------------- |
| `brand/`        | Wordmark / logo source, OG image         | —                 |
| `hero/`         | Cinematic arrival shot (dark bg)         | 16:9 → 21:9 (wide)|
| `experience/`   | Architectural archway / interior         | 3:4 (portrait)    |
| `rooftop/`      | Rooftop + city + tables + depth          | 16:9 (full-bleed) |
| `dining/`       | Interior / plated editorial              | 4:5 (portrait)    |
| `bar/`          | Glass + liquid + light + smoke           | 1:1 or 4:5        |
| `after-dark/`   | Events — people, movement, imperfect     | 16:9              |
| `menu/`         | Individual dishes, close & tactile       | 1:1 (square)      |
| `visit/`        | Reservation / location ambience          | 16:9              |

## Naming

Lowercase, hyphenated, descriptive: `rooftop-sunset-tables.jpg`,
`dish-wagyu-dim-sum.jpg`. Keep the file extension of the original
(`.jpg`/`.png`); the build produces the modern formats for you.

## Photography direction (§16–17)

Believable food & skin tones — no crushed blacks, no heavy black gradient over
everything. Event shots stay imperfect, not polished to death. No stock look,
no AI food imagery.
