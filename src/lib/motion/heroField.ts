/**
 * The hero's ambient constellation field.
 *
 * Ported out of Hero.astro's inline script so it sits behind the same
 * reduced-motion gate as everything else — the previous version started an
 * unconditional `requestAnimationFrame` loop that never stopped and ignored the
 * visitor's motion preference entirely.
 *
 * Deliberately plain 2D canvas rather than WebGL: it is a background texture,
 * not a centrepiece, and it costs ~2 KB instead of ~600 KB.
 */
export function initHeroField(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-signal-canvas]");
  if (!canvas) return () => {};

  const context = canvas.getContext("2d");
  if (!context) return () => {};

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  const COLUMNS = 14;
  const ROWS = 5;
  const points = Array.from({ length: COLUMNS * ROWS }, (_, index) => ({
    x: (index % COLUMNS) / (COLUMNS - 1),
    y: Math.floor(index / COLUMNS) / (ROWS - 1),
    phase: index * 0.41
  }));

  let frame = 0;
  let running = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    // Cap DPR at 2: beyond that the cost doubles for no visible gain on a
    // field of 1px dots.
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * scale);
    canvas.height = Math.floor(rect.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };

  const draw = (time: number) => {
    if (!running) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    // Ease the pointer rather than reading it raw — a 1:1 mapping reads as
    // twitchy, a lagged one reads as parallax.
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    const t = time * 0.00028;
    const influenceX = (pointer.x - 0.5) * 46;
    const influenceY = (pointer.y - 0.5) * 30;

    const plotted = points.map((point) => ({
      x: point.x * width + Math.sin(t + point.phase) * 16 + influenceX * (0.4 + point.y),
      y: point.y * height + Math.cos(t + point.phase) * 13 + influenceY * (0.4 + point.x)
    }));

    context.lineWidth = 1;
    for (let i = 0; i < plotted.length; i += 1) {
      for (let j = i + 1; j < plotted.length; j += 1) {
        const distance = Math.hypot(plotted[i].x - plotted[j].x, plotted[i].y - plotted[j].y);
        if (distance > 132) continue;
        context.globalAlpha = (1 - distance / 132) * 0.24;
        context.strokeStyle = "#4a9ee0";
        context.beginPath();
        context.moveTo(plotted[i].x, plotted[i].y);
        context.lineTo(plotted[j].x, plotted[j].y);
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    plotted.forEach((point, index) => {
      context.fillStyle = index % 7 === 0 ? "#4a9ee0" : "rgba(242, 243, 245, 0.5)";
      context.beginPath();
      context.arc(point.x, point.y, index % 7 === 0 ? 1.9 : 1.2, 0, Math.PI * 2);
      context.fill();
    });

    frame = requestAnimationFrame(draw);
  };

  const onPointerMove = (event: PointerEvent) => {
    pointer.tx = event.clientX / Math.max(1, window.innerWidth);
    pointer.ty = event.clientY / Math.max(1, window.innerHeight);
  };

  // Stop burning frames once the hero has scrolled away, and when the tab is
  // hidden. Neither was true of the original loop.
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        frame = requestAnimationFrame(draw);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
    },
    { threshold: 0 }
  );
  observer.observe(canvas);

  const onVisibility = () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frame);
    } else if (!running) {
      running = true;
      frame = requestAnimationFrame(draw);
    }
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  frame = requestAnimationFrame(draw);

  return () => {
    running = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
