# Architecture Notes

## Decision

Use Astro with React islands and TypeScript.

This gives the portfolio a static-first core while keeping room for server endpoints, OAuth callbacks, API providers, and agent streaming.

## Why This Fits

- The public portfolio is mostly content, so Astro keeps the first load lean.
- Interactivity is isolated to islands, starting with `AtlasDock.tsx`.
- Professional content is typed in `src/data` instead of embedded across page markup.
- API integrations are isolated in `src/lib/social`, which keeps OAuth scopes, required environment variables, and risk posture explicit.
- Agent events are isolated in `src/lib/agent`, so the frontend can move toward AG-UI semantics without coupling the whole site to a specific agent framework.

## Presentation Layer

The visual system is dark-first and lives in three stylesheets with distinct jobs:

- `src/styles/tokens.css` — the only place colour, type scale, spacing, z-index, radius
  and easing values are defined. Nothing else declares a raw hex or a magic z-index.
  The accent ramp is the real Atlas brand gradient, so portfolio and product share one
  identity rather than inventing a second.
- `src/styles/global.css` — reset, base typography, and the few primitives that appear on
  every page (`.container`, `.section`, `.button`, `.tag`, `.eyebrow`, `.text-gradient`).
- `src/styles/motion.css` — reveal states, keyframes, and the reduced-motion block.

Component-specific CSS lives in each component's own scoped `<style>` block. `global.css`
was previously a single flat 1,150-line sheet, which made it impossible to tell what a
change would touch.

Fonts are installed as `@fontsource` packages and imported from `global.css`, so there is
no third-party font request and no external FOUT.

## Motion Layer

`src/lib/motion/` owns every JavaScript-driven effect, booted once from `Layout.astro`.
Three conventions apply, and they are not negotiable:

1. **Division of labour.** Plain reveals are CSS (`animation-timeline: view()`), which
   costs no JavaScript and runs off the main thread. GSAP is used only for what CSS
   cannot do: pinning, scrubbing, sequenced timelines and per-line text splitting.
2. **Reduced motion means nothing mounts.** Everything sits inside a `gsap.matchMedia()`
   keyed on `(prefers-reduced-motion: no-preference)` — no Lenis, no ScrollTriggers, no
   hero canvas, no custom cursor. `motion.css` neutralises its own layer independently,
   so the guarantee holds from both directions.
3. **The default state of every element is visible.** Hidden-then-revealed states are
   applied only inside `@supports (animation-timeline: view())`. A browser without
   scroll-driven animations gets a complete static page, and no script failure can leave
   content permanently invisible.

Lenis is constructed with `autoRaf: false` and stepped from `gsap.ticker`; two separate
rAF loops desynchronise and make pinned sections judder. View transitions re-run
`initMotion` on `astro:page-load` and `destroyMotion` on `astro:before-swap` — without the
teardown, ScrollTriggers accumulate on every navigation.

`docs/modern-web-craft.md` explains the reasoning and the research behind these choices.

## Agent UI Direction

AG-UI is an event-based protocol for connecting agent backends to user-facing applications. The current `AtlasDock` is intentionally small: it consumes streaming events from `/api/agent/stream` and can later map those events to AG-UI clients or CopilotKit-style tooling.

Reference: https://docs.ag-ui.com/introduction

## Runtime Boundaries

Public browser code:

- Renders the portfolio.
- Opens the Atlas panel.
- Calls server endpoints.
- Never receives platform secrets.

Server code:

- Owns OAuth callbacks.
- Stores and refreshes tokens.
- Applies X spend controls.
- Calls official APIs.
- Streams agent events.

External systems:

- GitHub as public evidence source.
- LinkedIn, TikTok, and X as authorized API providers.
- LLM provider for Atlas when the preview mode is replaced.
