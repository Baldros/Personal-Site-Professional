# Andre Amorim Personal Site

Professional portfolio for Andre Amorim, rebuilt from the Streamlit prototype into a modern TypeScript web project.

The site is designed to work in two layers:

1. A fast professional portfolio with structured content, SEO-friendly pages, and refined visual design.
2. A server-ready layer for Atlas, OAuth, and official platform APIs.

## Stack

- Bun for local package management and scripts.
- Astro for the content-first site shell.
- React islands for interactive UI, currently the Atlas dock.
- TypeScript for typed profile, project, API, and agent modules.
- Astro Node adapter for server endpoints and future OAuth callbacks.

## Local Development

```bash
bun install
bun run dev
```

Build:

```bash
bun run build
```

Preview:

```bash
bun run preview
```

## Project Structure

```text
src/
  components/         UI components and React islands
  data/               Typed professional content and API strategy
  lib/
    agent/            Atlas preview answers and streaming event helpers
    social/           Official social API provider registry
  pages/
    api/              Server endpoints
    index.astro       Main portfolio page
  styles/             Global and Atlas styles
docs/                 Architecture, API, and deployment notes
```

## API Direction

LinkedIn should be the first integration because it aligns with the professional purpose of the site and supports Share on LinkedIn through `w_member_social`.

TikTok can support profile/video display and content posting, but posting requires app review.

X should be optional and budget-gated because the current official API model is pay-per-use.

See [docs/api-integrations.md](docs/api-integrations.md).

## Deployment

The current build uses Astro server output because future OAuth and AI endpoints require server-side code. On Hostinger, use a Node-capable plan or VPS. Static hosting is possible only if API routes are moved to a separate backend.

See [docs/hostinger-deploy.md](docs/hostinger-deploy.md).
