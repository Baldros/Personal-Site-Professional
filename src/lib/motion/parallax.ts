import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Multi-plane parallax.
 *
 * Markup contract: `data-parallax="<depth>"` where depth is roughly the
 * fraction of the scroll distance the plane lags (or leads) the page by.
 *
 *   data-parallax="0.35"   travels with the page but slower  -> reads far away
 *   data-parallax="-0.2"   travels against the page          -> reads close up
 *
 * Stacking three or four of these at different depths inside one section is
 * the whole trick behind the "multiplano" look on the reference sites. There
 * is no 3D and no WebGL involved — only transforms on the compositor.
 */
export function initParallax(): () => void {
  const planes = gsap.utils.toArray<HTMLElement>("[data-parallax]");
  if (!planes.length) return () => {};

  const tweens = planes.map((plane) => {
    const depth = Number(plane.dataset.parallax ?? 0.2);
    // The container the plane parallaxes *within*; defaults to its own parent
    // so a plane can be scoped to a section rather than the whole document.
    const scope = plane.closest<HTMLElement>("[data-parallax-scope]") ?? plane.parentElement;

    return gsap.to(plane, {
      yPercent: depth * 100,
      ease: "none",
      scrollTrigger: {
        trigger: scope ?? plane,
        start: "top bottom",
        end: "bottom top",
        // A number rather than `true` adds a short catch-up lerp, which is what
        // stops parallax from feeling mechanically welded to the wheel.
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });
  });

  return () => {
    tweens.forEach((tween) => {
      tween.scrollTrigger?.kill();
      tween.kill();
    });
  };
}

/**
 * Horizontal track: the section pins to the viewport and its inner rail slides
 * sideways as the page scrolls down.
 *
 * This is the one effect on the site that genuinely requires GSAP. Everything
 * else here could be approximated with `position: sticky` and a CSS
 * scroll-timeline — but translating vertical scroll distance into horizontal
 * travel needs `pin` plus `scrub`, and CSS has no equivalent.
 *
 * Markup contract:
 *   <div data-track><div data-track-inner> ...cards... </div></div>
 *
 * Mounted at desktop widths only (see src/lib/motion/index.ts). On narrow
 * screens the rail is left as an ordinary horizontally-scrollable strip, which
 * is both cheaper and easier to operate with a thumb.
 */
export function initHorizontalTrack(): () => void {
  const tracks = gsap.utils.toArray<HTMLElement>("[data-track]");
  if (!tracks.length) return () => {};

  const tweens = tracks.map((track) => {
    const inner = track.querySelector<HTMLElement>("[data-track-inner]");
    if (!inner) return null;

    // Recomputed on every refresh rather than captured once, so a font load or
    // a resize cannot leave the end position stale.
    const distance = () => Math.max(0, inner.scrollWidth - window.innerWidth * 0.92);

    return gsap.to(inner, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  });

  return () => {
    tweens.forEach((tween) => {
      if (!tween) return;
      tween.scrollTrigger?.kill();
      tween.kill();
    });
    ScrollTrigger.refresh();
  };
}
