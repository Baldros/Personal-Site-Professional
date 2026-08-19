import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/**
 * Smooth scroll, driven by GSAP's ticker.
 *
 * The single most common way to get this wrong is to let Lenis run its own
 * requestAnimationFrame loop while GSAP runs another: the two clocks drift and
 * ScrollTrigger ends up reading a scroll position one frame stale, which shows
 * up as pinned sections juddering. So Lenis is constructed with
 * `autoRaf: false` and stepped from `gsap.ticker` instead — one loop, one clock.
 *
 * Note Lenis does not hijack scrolling the way Locomotive Scroll does; it
 * interpolates on top of the *native* scroll position. Anchor links,
 * `position: sticky`, find-in-page and scroll restoration all keep working.
 */
export function initSmoothScroll(): () => void {
  const lenis = new Lenis({
    autoRaf: false,
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Touch devices already have momentum scrolling from the OS; smoothing it
    // again feels laggy and costs battery.
    syncTouch: false
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);

  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);

  // GSAP normally drops a frame's delta when the tab has been throttled. That
  // protects animations but desynchronises a scroll-linked one, so off it goes.
  gsap.ticker.lagSmoothing(0);

  // Anchor links must go through Lenis, otherwise the browser jumps natively
  // and Lenis snaps it back on the next frame.
  const onAnchorClick = (event: MouseEvent) => {
    const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      'a[href^="#"]'
    );
    if (!anchor) return;

    const id = anchor.getAttribute("href");
    if (!id || id === "#") return;

    const target = document.querySelector(id);
    if (!target) return;

    event.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -90 });
  };
  document.addEventListener("click", onAnchorClick);

  ScrollTrigger.refresh();

  return () => {
    document.removeEventListener("click", onAnchorClick);
    lenis.off("scroll", onScroll);
    gsap.ticker.remove(raf);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
  };
}
