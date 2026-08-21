/**
 * animations.ts — the site's scroll-motion system (GSAP + ScrollTrigger).
 *
 * Applied by data-attribute so markup stays declarative:
 *   [data-split]              headline lines rise from behind a mask
 *   [data-reveal]             element fades + rises in (with optional stagger group)
 *   [data-parallax="0.2"]     element drifts at a speed factor while in view
 *   [data-clip]               image wipes in via clip-path
 *   [data-magnetic]           element attracts toward the cursor
 *   [data-count]              number counts up when it enters
 *   [data-horizontal]         section pins and scrolls its track sideways
 *
 * Only called on the enhanced path (JS on, motion allowed). Without it the
 * static markup is fully readable.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Wrap each <br>-delimited line in a mask + inner span for the rise reveal. */
function splitLines(el: HTMLElement): HTMLElement[] {
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = lines
    .map((l) => `<span class="line-mask"><span class="line-inner">${l}</span></span>`)
    .join("");
  return Array.from(el.querySelectorAll<HTMLElement>(".line-inner"));
}

export function initAnimations(): void {
  // --- Headline line reveals ------------------------------------------------
  gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
    const lines = splitLines(el);
    gsap.set(lines, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(lines, {
          yPercent: 0,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.12,
        }),
    });
  });

  // --- Fade + rise reveals (batched, staggered by proximity) ----------------
  const revealables = gsap.utils.toArray<HTMLElement>("[data-reveal]");
  if (revealables.length) {
    gsap.set(revealables, { y: 36, autoAlpha: 0 });
    ScrollTrigger.batch(revealables, {
      start: "top 86%",
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          overwrite: true,
        }),
    });
  }

  // --- Parallax drift -------------------------------------------------------
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || "0.18");
    gsap.fromTo(
      el,
      { yPercent: -amount * 100 },
      {
        yPercent: amount * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") ?? el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });

  // --- Image reveal: horizontal curtain wipe (left → right) -----------------
  gsap.utils.toArray<HTMLElement>("[data-clip]").forEach((el) => {
    gsap.fromTo(
      el,
      { clipPath: "inset(0% 100% 0% 0%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.25,
        ease: "power3.inOut",
        scrollTrigger: { trigger: el, start: "top 82%", once: true },
      }
    );
  });

  // --- Count-up -------------------------------------------------------------
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const decimals = Number(el.dataset.decimals) || 0;
    const suffix = el.dataset.suffix ?? "";
    const pad = Number(el.dataset.pad) || 0;
    const obj = { v: 0 };
    const write = () => {
      let s = decimals ? obj.v.toFixed(decimals) : String(Math.round(obj.v));
      if (pad) s = s.padStart(pad, "0");
      el.textContent = s + suffix;
    };
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => gsap.to(obj, { v: target, duration: 1.4, ease: "power2.out", onUpdate: write }),
    });
  });

  // --- Magnetic elements ----------------------------------------------------
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer) {
    gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic || "0.35");
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
          duration: 0.5,
          ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", () =>
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" })
      );
    });
  }

  // --- Horizontal-scroll sections (pin + translate track sideways) ----------
  const horizontals = gsap.utils.toArray<HTMLElement>("[data-horizontal]");
  if (horizontals.length) document.documentElement.classList.add("has-horizontal");
  horizontals.forEach((section) => {
    const track = section.querySelector<HTMLElement>("[data-horizontal-track]");
    if (!track) return;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
  });
}
