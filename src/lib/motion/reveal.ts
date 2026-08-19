import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Per-line headline reveals.
 *
 * Plain fade/rise reveals are handled in CSS by `animation-timeline: view()`
 * (see src/styles/motion.css) — they cost no JavaScript and run off the main
 * thread. GSAP is used here only for the thing CSS still cannot do: split a
 * paragraph into its rendered *lines* and stagger them behind a mask.
 *
 * SplitText was a paid Club GreenSock plugin until April 2025; it ships free
 * with GSAP now.
 *
 * Note there is deliberately no CSS rule pre-hiding `[data-split]` before this
 * runs. Hiding text in CSS and revealing it from JS means any script failure
 * leaves the page permanently blank, and it buys nothing here: the only split
 * target above the fold is the hero lead, which should be readable
 * immediately, and everything below the fold is off-screen when this
 * initialises, so it is masked before it can ever be seen.
 */
export function initSplitReveals(): () => void {
  const targets = gsap.utils.toArray<HTMLElement>("[data-split]");
  if (!targets.length) return () => {};

  const splits: SplitText[] = [];
  const triggers: ScrollTrigger[] = [];

  targets.forEach((target) => {
    const split = new SplitText(target, {
      type: "lines",
      linesClass: "split-line__inner",
      // Wrapping each line in a masking element is what produces the
      // "rolling up from behind a hard edge" look rather than a plain fade.
      mask: "lines",
      autoSplit: true
    });
    splits.push(split);

    const tween = gsap.from(split.lines, {
      yPercent: 118,
      duration: 0.95,
      ease: "power4.out",
      stagger: 0.085,
      scrollTrigger: {
        trigger: target,
        start: "top 88%",
        once: true
      }
    });

    if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
  });

  return () => {
    triggers.forEach((trigger) => trigger.kill());
    splits.forEach((split) => split.revert());
  };
}
