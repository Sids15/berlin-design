/**
 * cinema.ts — drives the opening cinematic (see Hero.astro).
 *
 * Static base layout is already readable. This upgrades it to the pinned,
 * scroll-scrubbed experience when JS runs and motion is allowed:
 *   - Lenis smooths the whole page.
 *   - GSAP ScrollTrigger pins the stage and scrubs one timeline:
 *       pour frames → hero copy out → Experience beat → proof count-up → black.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function initCinema(): void {
  const section = document.querySelector<HTMLElement>("[data-cinema]");
  const pin = section?.querySelector<HTMLElement>("[data-cinema-pin]");
  const canvas = section?.querySelector<HTMLCanvasElement>("[data-cinema-canvas]");
  if (!section || !pin || !canvas) return;

  const ctx = canvas.getContext("2d");
  const count = Number(section.dataset.frameCount) || 0;
  const dir = section.dataset.frameDir ?? "";
  const frameUrl = (i: number) =>
    `${dir}/frame-${String(i + 1).padStart(4, "0")}.webp`;

  // --- Frame store + cover-fit draw ----------------------------------------
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

  // Preload frames in order (matches scroll order).
  for (let i = 0; i < count; i++) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      while (highestReady + 1 < count && images[highestReady + 1]?.complete) {
        highestReady++;
      }
      if (i === 0) {
        resize();
      }
    };
    img.src = frameUrl(i);
    images[i] = img;
  }

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  resize();
  window.addEventListener("resize", resize);

  // --- Reduced motion / no enhancement: static frame, keep base layout ------
  if (prefersReduced) {
    const still = Math.min(80, count - 1); // filled glass, bar behind
    const paint = () => (images[still]?.complete ? drawFrame(still) : requestAnimationFrame(paint));
    paint();
    return;
  }

  // --- Enhance to the pinned cinematic --------------------------------------
  section.classList.add("cinema--on");
  resize(); // canvas box changed with the cinematic class

  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll, wired into GSAP's ticker + ScrollTrigger.
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Smooth anchor links through Lenis.
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

  const frame = { i: 0 };
  const renderFrame = () => {
    const idx = nearestReady(Math.round(frame.i));
    if (idx !== drawn) drawFrame(idx);
  };

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * 6,
      pin,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Act I — pour scrub.
  tl.to(frame, { i: count - 1, ease: "none", duration: 5, onUpdate: renderFrame }, 0);
  tl.to('[data-beat="hero"]', { autoAlpha: 0, y: -30, ease: "power2.in", duration: 1.2 }, 3.6);
  tl.to('[data-beat="cue"]', { autoAlpha: 0, duration: 0.6 }, 3.6);

  // Act II · beat 1 — The Experience.
  tl.fromTo('[data-beat="1"]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1 }, 5.3);
  tl.to('[data-beat="1"]', { autoAlpha: 0, y: -30, ease: "power2.in", duration: 0.9 }, 7.4);

  // Act II · beat 2 — proof + count-up.
  tl.fromTo('[data-beat="2"]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1 }, 7.9);

  section.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const decimals = Number(el.dataset.decimals) || 0;
    const suffix = el.dataset.suffix ?? "";
    const pad = Number(el.dataset.pad) || 0;
    const proxy = { v: 0 };
    const write = () => {
      let s = decimals ? proxy.v.toFixed(decimals) : String(Math.round(proxy.v));
      if (pad) s = s.padStart(pad, "0");
      el.textContent = s + suffix;
    };
    tl.to(proxy, { v: target, duration: 1.1, ease: "power1.out", onUpdate: write }, 7.9);
  });

  tl.to('[data-beat="2"]', { autoAlpha: 0, y: -20, ease: "power2.in", duration: 0.9 }, 10.2);

  // Act III — release to black.
  tl.to("[data-cinema-endfade]", { autoAlpha: 1, duration: 1 }, 10.4);

  // Fonts can shift metrics; recalc once they're ready.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
