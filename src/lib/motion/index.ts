import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { initCounters } from "./counters";
import { initCursor } from "./cursor";
import { initHeroField } from "./heroField";
import { initHorizontalTrack, initParallax } from "./parallax";
import { initSplitReveals } from "./reveal";
import { initSmoothScroll } from "./smooth";

/**
 * Single boot for every JS-driven effect on the site.
 *
 * Everything lives inside a `gsap.matchMedia()` keyed on
 * `(prefers-reduced-motion: no-preference)`. That is not decoration: when a
 * visitor asks for reduced motion, none of this mounts at all — no Lenis, no
 * ScrollTriggers, no canvas loop, no custom cursor. The CSS in
 * src/styles/motion.css independently neutralises its own layer, so the page
 * degrades to a completely static, fully legible document from both directions.
 *
 * `initMotion` is idempotent and is re-run after every Astro view transition.
 */

let media: ReturnType<typeof gsap.matchMedia> | null = null;
let registered = false;

const NO_REDUCED = "(prefers-reduced-motion: no-preference)";
const DESKTOP_POINTER = `${NO_REDUCED} and (pointer: fine) and (min-width: 1024px)`;

export function initMotion(): void {
  destroyMotion();

  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    registered = true;
  }

  media = gsap.matchMedia();

  media.add(NO_REDUCED, () => {
    const cleanups = [
      initSmoothScroll(),
      initSplitReveals(),
      initParallax(),
      initCounters(),
      initHeroField()
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  });

  // The horizontal track pins the viewport, which is the wrong trade on a
  // phone: it eats scroll distance and fights thumb gestures. Below this width
  // the same rail is left as an ordinary overflow-x strip.
  media.add(`${NO_REDUCED} and (min-width: 1024px)`, () => initHorizontalTrack());

  // The custom cursor is pointer-dependent, not just motion-dependent: a touch
  // device has no cursor to replace, and a coarse pointer at desktop width
  // (a TV, a kiosk) should not get one either.
  media.add(DESKTOP_POINTER, () => initCursor());
}

export function destroyMotion(): void {
  media?.revert();
  media = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}
