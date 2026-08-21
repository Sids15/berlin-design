/**
 * cinema.ts — the homepage scroll controller.
 *
 *   1. Lenis smooth-scroll for the whole page (+ smooth anchor links).
 *   2. The hero: a pinned pour scrub that freezes on its final frame, then
 *      releases into the flowing site.
 *   3. Generic scroll reveals for [data-reveal] elements in every section.
 *
 * Progressive enhancement: the static markup is already readable. This only
 * runs its effects when JS is present and motion is allowed.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { initAnimations } from "./animations";

export function initCinema(): void {
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const pin = hero?.querySelector<HTMLElement>("[data-hero-pin]");
  const canvas = hero?.querySelector<HTMLCanvasElement>("[data-hero-canvas]");

  // ---- Hero frame machinery ------------------------------------------------
  const setupHero = () => {
    if (!hero || !pin || !canvas) return null;
    const ctx = canvas.getContext("2d");
    const count = Number(hero.dataset.frameCount) || 0;
    const dir = hero.dataset.frameDir ?? "";
    const frameUrl = (i: number) =>
      `${dir}/frame-${String(i + 1).padStart(4, "0")}.webp`;

    const images: HTMLImageElement[] = [];
    let highestReady = -1;
    let drawn = -1;

    const drawFrame = (index: number) => {
      const img = images[index];
      if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      drawn = index;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      const redraw = drawn >= 0 ? drawn : 0;
      drawn = -1;
      drawFrame(redraw);
    };

    const nearestReady = (index: number) =>
      index <= highestReady ? index : Math.max(highestReady, 0);

    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        while (highestReady + 1 < count && images[highestReady + 1]?.complete) {
          highestReady++;
        }
        if (i === 0) resize();
      };
      img.src = frameUrl(i);
      images[i] = img;
    }

    resize();
    window.addEventListener("resize", resize);
    return { count, drawFrame, nearestReady, get drawn() { return drawn; } };
  };

  const frames = setupHero();

  // ---- Reduced motion: hold a still frame, leave the page static ----------
  if (prefersReduced) {
    if (frames) {
      const still = Math.min(80, frames.count - 1); // filled glass, bar behind
      const paint = () => {
        frames.drawFrame(still);
        if (frames.drawn !== still) requestAnimationFrame(paint);
      };
      paint();
    }
    return;
  }

  // ---- Enhance -------------------------------------------------------------
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });

  // Hero: pin + scrub the pour, freeze on the last frame, fade copy near the end.
  if (hero && pin && frames) {
    const proxy = { i: 0 };
    const render = () => {
      const idx = frames.nearestReady(Math.round(proxy.i));
      if (idx !== frames.drawn) frames.drawFrame(idx);
    };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: () => "+=" + window.innerHeight * 3,
        pin,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.to(proxy, { i: frames.count - 1, ease: "none", duration: 1, onUpdate: render }, 0);
    tl.to('[data-hero-copy]', { autoAlpha: 0, y: -30, ease: "power2.in", duration: 0.28 }, 0.72);
  }

  // The full scroll-motion system (split text, reveals, parallax, clip wipes,
  // count-ups, magnetic, horizontal sections).
  initAnimations();

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
