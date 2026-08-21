# Video & static media

Drop **video files here**. Files in `public/` are served **as-is** (Astro does
not transcode video), so prepare them before adding:

- **Two formats** for coverage: `.webm` (VP9/AV1) **and** `.mp4` (H.264).
- **Compress first.** Aim for a few MB, not tens. Background loops should be
  short, muted, and heavily compressed.
- Add a **poster** frame (a still image) so nothing flashes before playback —
  put the poster in `src/assets/<section>/` so it gets optimized.

## Referencing a video

`public/` files are referenced by **absolute URL** (no import). A file at
`public/videos/after-dark-loop.mp4` is served at `/videos/after-dark-loop.mp4`:

```astro
---
import posterImg from "../../assets/after-dark/after-dark-poster.jpg";
---
<video
  class="bg-video"
  autoplay muted loop playsinline
  poster={posterImg.src}
  preload="none"
>
  <source src="/videos/after-dark-loop.webm" type="video/webm" />
  <source src="/videos/after-dark-loop.mp4" type="video/mp4" />
</video>
```

Always ship `muted` + `playsinline` for autoplay loops, and gate motion-heavy
video behind `prefers-reduced-motion` where it isn't essential (§25).

## Suggested layout

```
public/videos/
├── hero/          # optional hero background loop
├── after-dark/    # events / nightlife footage
└── <section>/     # any other section loop
```

## Naming

Lowercase, hyphenated, descriptive, with the section as a hint:
`hero-rooftop-loop.mp4`, `after-dark-live-set.webm`.
