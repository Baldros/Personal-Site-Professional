import { gsap } from "gsap";

/**
 * Custom cursor with magnetic targets.
 *
 * Mounted only on fine pointers at desktop widths (see src/lib/motion/index.ts)
 * and never under reduced motion. The native cursor is hidden only *after* ours
 * is confirmed running, so a failure here can never leave a visitor with no
 * pointer at all.
 */
export function initCursor(): () => void {
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.appendChild(cursor);

  const setX = gsap.quickTo(cursor, "x", { duration: 0.42, ease: "power3.out" });
  const setY = gsap.quickTo(cursor, "y", { duration: 0.42, ease: "power3.out" });

  let activated = false;
  const onMove = (event: PointerEvent) => {
    if (!activated) {
      activated = true;
      cursor.classList.add("is-active");
      document.documentElement.classList.add("has-custom-cursor");
      gsap.set(cursor, { x: event.clientX, y: event.clientY });
    }
    setX(event.clientX);
    setY(event.clientY);
  };

  const hoverSelector = 'a, button, [data-magnetic], [role="button"]';
  const onOver = (event: PointerEvent) => {
    const target = (event.target as HTMLElement | null)?.closest(hoverSelector);
    if (target) cursor.classList.add("is-hovering");
  };
  const onOut = (event: PointerEvent) => {
    const target = (event.target as HTMLElement | null)?.closest(hoverSelector);
    if (target) cursor.classList.remove("is-hovering");
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut);

  // --- magnetic buttons ---------------------------------------------------
  const magnets = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
  const magnetCleanups = magnets.map((magnet) => {
    const strength = Number(magnet.dataset.magnetic || 0.32);
    const moveX = gsap.quickTo(magnet, "x", { duration: 0.5, ease: "power3.out" });
    const moveY = gsap.quickTo(magnet, "y", { duration: 0.5, ease: "power3.out" });

    const onMagnetMove = (event: PointerEvent) => {
      const rect = magnet.getBoundingClientRect();
      moveX((event.clientX - (rect.left + rect.width / 2)) * strength);
      moveY((event.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onMagnetLeave = () => {
      moveX(0);
      moveY(0);
    };

    magnet.addEventListener("pointermove", onMagnetMove);
    magnet.addEventListener("pointerleave", onMagnetLeave);

    return () => {
      magnet.removeEventListener("pointermove", onMagnetMove);
      magnet.removeEventListener("pointerleave", onMagnetLeave);
      gsap.set(magnet, { x: 0, y: 0 });
    };
  });

  return () => {
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("pointerout", onOut);
    magnetCleanups.forEach((cleanup) => cleanup());
    document.documentElement.classList.remove("has-custom-cursor");
    cursor.remove();
  };
}
