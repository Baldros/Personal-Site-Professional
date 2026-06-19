# Architecture Notes

## Decision

Use Astro with React islands and TypeScript.

This gives the portfolio a static-first core while keeping room for server endpoints, OAuth callbacks, API providers, and agent streaming.

## Why This Fits

- The public portfolio is mostly content, so Astro keeps the first load lean.
- Interactivity is isolated to islands, starting with `AtlasDock.tsx`.
- Professional content is typed in `src/data` instead of embedded across page markup.
- API integrations are isolated in `src/lib/social`, which keeps OAuth scopes, required environment variables, and risk posture explicit.
- Agent events are isolated in `src/lib/agent`, so the frontend can move toward the Atlas event protocol without coupling the whole site to a specific agent framework.

## Agent UI Direction

The Atlas dock connects to the Atlas backend (`atlasd`), whose event protocol is
the source of truth for the streaming UI. The integration is specified in
[atlas-integration.md](atlas-integration.md) (architecture, topology, runtime
boundary) and [atlas-contract.md](atlas-contract.md) (endpoints and the SSE event
vocabulary).

The current `AtlasDock` is intentionally small and runs a **local preview/mock**:
it buffers a canned response from `/api/agent/stream` (`src/lib/agent/*`). The mock
emits an AG-UI-style placeholder shape (`RUN_STARTED` / `TEXT_MESSAGE_CONTENT` /
`RUN_FINISHED`); that is **not** what `atlasd` speaks. When the connection is built,
the dock adopts the real `atlasd` event vocabulary (`thinking` / `answer_chunk` /
`tool_*` / `delegate_*` / `message_end` / `done`) and streams incrementally instead
of buffering — see [atlas-contract.md §3](atlas-contract.md).

AG-UI reference (for context only, not the implemented protocol): https://docs.ag-ui.com/introduction

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
- Streams agent events by proxying to `atlasd` (the only component that reaches the backend; the browser never does). See [atlas-integration.md §3](atlas-integration.md).

External systems:

- GitHub as public evidence source.
- LinkedIn, TikTok, and X as authorized API providers.
- `atlasd` (the Atlas backend / hollow broker) as the agent runtime that replaces preview mode. It owns the LLM provider keys; the site selects a provider/model by label and never holds the keys. See [atlas-integration.md](atlas-integration.md).
