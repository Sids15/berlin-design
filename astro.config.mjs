// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // React is loaded only as islands, on the handful of components that
  // genuinely need client interactivity (day→night scroll, mobile menu,
  // menu carousel). Everything else ships as static HTML with zero JS.
  integrations: [react()],

  image: {
    // Astro emits AVIF + WebP with responsive srcset and lazy-loading —
    // Section 26 (Performance Rules) satisfied by the build pipeline.
    responsiveStyles: true,
  },
});
