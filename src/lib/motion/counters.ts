import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Counts a number up when it scrolls into view.
 *
 * Markup contract: `data-count="58"` on an element whose text content is the
 * final rendered value, e.g. `<strong data-count="58">58+</strong>`. The
 * suffix/prefix around the digits is preserved, so "58+" counts to 58 and keeps
 * its plus sign, and a value with no digits is simply left alone.
 */
export function initCounters(): () => void {
  const counters = gsap.utils.toArray<HTMLElement>("[data-count]");
  if (!counters.length) return () => {};

  const triggers: ScrollTrigger[] = [];

  counters.forEach((counter) => {
    const target = Number(counter.dataset.count);
    if (!Number.isFinite(target)) return;

    const final = counter.textContent ?? "";
    const digits = final.match(/[\d.,]+/);
    if (!digits) return;

    const prefix = final.slice(0, digits.index ?? 0);
    const suffix = final.slice((digits.index ?? 0) + digits[0].length);
    // "14,649" must not count up to a bare "14649" — keep whatever grouping the
    // authored value used.
    const grouped = digits[0].includes(",");
    const format = (value: number) =>
      grouped ? Math.round(value).toLocaleString("en-US") : String(Math.round(value));
    const state = { value: 0 };

    const tween = gsap.to(state, {
      value: target,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => {
        counter.textContent = `${prefix}${format(state.value)}${suffix}`;
      },
      scrollTrigger: {
        trigger: counter,
        start: "top 90%",
        once: true
      }
    });

    if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
    counter.textContent = `${prefix}${format(0)}${suffix}`;
  });

  return () => triggers.forEach((trigger) => trigger.kill());
}
