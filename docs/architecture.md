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
