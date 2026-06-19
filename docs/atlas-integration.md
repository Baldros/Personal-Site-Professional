# Atlas Integration

How this site talks to the Atlas backend (`atlasd`). This document defines the
**target architecture and the rules of engagement**; the precise wire contract
(endpoints, request bodies, SSE events) lives in
[`atlas-contract.md`](atlas-contract.md).

> **Status.** Implemented (config-driven), preview by default. The dock connects
> to `atlasd` when `ATLAS_ENABLED=true` and `ATLAS_API_URL` is set; otherwise it
> serves a local **preview** (`src/lib/agent/answers.ts`). Both paths speak the
> same public event protocol (`src/lib/agent/protocol.ts`) through the server
> proxy (`src/pages/api/agent/stream.ts` → `src/lib/agent/upstream.ts`). This
> document is the contract that implementation follows; the topology choice (§2)
> is still open and is pure configuration.

---

## 1. What `atlasd` is (and is not)

`atlasd` is the Go **control-plane / hollow broker** of the Atlas Desktop Agent
(`Core-Desktop-Agent`, the `atlasd` binary). Two facts drive every decision below:

1. **It is a broker, not a model.** `atlasd` owns *no* AI. All intelligence — the
   `TeamLeader` supervisor and every specialist — runs **outside** the backend as
   independent agents, attached over the language-agnostic `agentd` contract. The
   broker is an API gateway + persistence + agent registry + scheduler + SSE relay.
   - **Consequence:** a running `atlasd` with **no root agent mounted** answers a
     chat turn with an SSE `error` (`"No agent is available to handle the
     request."`) followed by `done(failed)`. "The backend is up" and "the backend
     can answer" are two different states. The site MUST treat the no-agent state
     as a first-class, expected outcome, not a crash.

2. **It is local-first and loopback by default.** `atlasd` binds `127.0.0.1:8000`
   (`ATLAS_API_HOST` / `ATLAS_API_PORT`), with **no authentication** (it assumes a
   trusted loopback on the user's own machine) and permissive CORS
   (`allow_origins=["*"]`, `allow_credentials=false`). It was built to be talked to
   by a desktop shell (Electron) and a mobile client on the same machine/LAN — not
   to be a public, multi-tenant web API.
   - **Consequence:** exposing `atlasd` directly to the public internet is **out of
     contract**. The site reaches it through a server-side proxy (§3), never from
     the browser.

The authoritative backend reference is
`Core-Desktop-Agent/docs/HTTP_CONTRACT.md` (frozen v0.1.0) in the
`Atlas-Desktop-Agent` repository. Where this site's docs and that file disagree,
**`HTTP_CONTRACT.md` wins** — restate it here, never contradict it.

---

## 2. Topology — the one open decision

The site is a public web app; `atlasd` is a single-user loopback sidecar. Bridging
those two is the one architectural choice that must be made before the dock can go
live. The wire contract in [`atlas-contract.md`](atlas-contract.md) is identical
for every option — only *where `atlasd` runs and who may reach it* changes.

| Option | Where `atlasd` runs | Who can chat | Cost / ops | Trade-off |
| --- | --- | --- | --- | --- |
| **A — User-local** | On each visitor's own machine (their Atlas install) | Only visitors who run Atlas locally | None for the site owner | Preserves local-first; useless to a visitor without Atlas. The site auto-detects `http://127.0.0.1:8000` and degrades to preview mode when absent. |
| **B — Owner-hosted** | One instance the site owner runs (VPS/box), reached via the site's server proxy | Any visitor | Owner hosts `atlasd` + agents + API keys, and pays model usage | A public, owner-funded brain. Needs the hardening §3/§5 demand (atlasd has no auth of its own). |
| **C — Prepare only** | Undecided | — | — | Document and structure the site so either A or B is a small, localized change. **This is the current scope.** |

**Current scope is C.** This document and the contract make the site *ready* to
connect; selecting A vs B is deferred. Whichever is chosen, the **proxy boundary
(§3) and the secret/runtime boundary (§5) are mandatory** — they are the same in
both A and B.

---

## 3. The connection boundary — server-side proxy only

The browser never talks to `atlasd` directly. A first-party server endpoint on
this site (Astro Node output, the existing `/api/agent/*` surface) is the **only**
thing that opens a connection to `atlasd`. This is non-negotiable for three
reasons: `atlasd` has no auth, model API keys must stay server-side, and the
public event stream must be sanitized (§4.2) before it reaches a browser.

```
 Browser (AtlasDock island)
     │  POST /api/agent/stream         ← first-party, same-origin
     ▼
 Site server (Astro Node adapter)      ← holds ATLAS_API_URL, applies §4.2 + §5
     │  POST {ATLAS_API_URL}/v1/chat/stream   (SSE)
     ▼
 atlasd  (loopback or owner-hosted broker)
     │  invoke (agentd)
     ▼
 External agents: TeamLeader + specialists
```

The site proxy is responsible for: holding the `atlasd` base URL, creating/reusing
a `conversation_id`, forwarding the SSE stream, **translating the event vocabulary
(§4.1)**, stripping internal provenance the public site should not show (§4.2), and
falling back to preview mode when `atlasd` is unreachable or has no agent (§6).

### Configuration (server-side env)

> Implemented in `src/lib/agent/config.ts`, read from `process.env` at request
> time, and present in `.env.example`. Server-side only — never exposed to the
> browser.

| Var | Purpose | Example |
| --- | --- | --- |
| `ATLAS_API_URL` | Base URL of the `atlasd` broker the proxy targets | `http://127.0.0.1:8000` |
| `ATLAS_ENABLED` | Master switch; when off, the dock stays in preview mode | `false` |
| `ATLAS_REQUEST_TIMEOUT_MS` | Upstream timeout before falling back to preview | `30000` |

The site MUST default to preview mode when `ATLAS_ENABLED` is unset/false or
`ATLAS_API_URL` is empty, so a normal portfolio deploy never breaks.

---

## 4. Event protocol — site events vs Atlas events

This is the largest gap between the current mock and a real connection.

### 4.1 One vocabulary, end to end

The earlier mock emitted **AG-UI**-style events (`RUN_STARTED` /
`TEXT_MESSAGE_CONTENT` / `RUN_FINISHED`); `atlasd` emits its **own** vocabulary.
Rather than translate `atlasd` → AG-UI, the implementation **adopts the `atlasd`
vocabulary as the source of truth**: the public protocol
(`src/lib/agent/protocol.ts`) mirrors it, and the browser parses that one
vocabulary whether the turn is served **live** or by **preview**.

| `atlasd` event | Public protocol | Rendered by the dock today |
| --- | --- | --- |
| `answer_chunk` (`text`) | `answer_chunk` | yes — streamed delta |
| `answer` (`text`) | `answer` | yes — appended |
| `thinking` | `thinking` | forwarded; not rendered |
| `tool_start` / `tool_end` | same, name/status only | forwarded; not rendered |
| `message_end` (`final`) | `message_end` (`final`) | forwarded; not rendered |
| `delegate_start` / `delegate_end` | **dropped** | — |
| `error` → `done(failed)` | `error` / `done` | yes |
| `done` (`status`) | `done` | yes — the single terminal event |
| *(proxy meta)* | `status` (`mode`: live/preview) | yes — live/preview badge |

The full backend event table is in [`atlas-contract.md` §3](atlas-contract.md).

### 4.2 Public-surface filtering

`atlasd` is designed to stream the **full wire bundle** of a turn — thinking,
tool calls, sub-agent activity, provenance (`agent`, `delegation_id`,
`message_id`) — and let the *client* decide what to render
(`HTTP_CONTRACT.md §5.2`). On a **public portfolio**, most of that is internal.
The site proxy MUST decide, per event type, what crosses to the browser. A safe
default for the public dock:

- **Forward:** `answer_chunk` / `answer` (the user-facing reply), `done`.
- **Optionally surface (UX choice):** `thinking`, `tool_start` / `tool_end`
  (as a tasteful "working…" indicator), without leaking raw `args`/`result`.
- **Drop from the public stream:** raw provenance ids, internal `agent` names,
  raw tool arguments/results, and delegated sub-agent answer text — unless a
  deliberate "show the agent's work" feature is built.

This filtering is a site-proxy responsibility precisely *because* the backend
refuses to make the decision for it.

### 4.3 Streaming, for real

`AtlasDock.tsx` reads the SSE body incrementally via a `Response.body` reader and
the shared `createSseParser`, appending `answer_chunk` text as it arrives, so
tokens appear live. The terminal signal is the `done` event, **not** end-of-body
(the proxy also emits a terminal `done` if the upstream omits one).

---

## 5. Secret & runtime boundary

Restating the site's runtime boundary (`architecture.md`) against Atlas:

- **Model API keys live in `atlasd`, not the site.** `atlasd` owns provider keys
  via OS keyring / env and exposes only *status* over `/v1/settings/api-keys`
  (never values). The site must not hold or proxy raw model keys; it selects a
  `provider`/`model` by label and lets the broker authenticate.
- **The browser receives reply text and curated events only** — never the
  `atlasd` base URL, never provider keys, never raw tool I/O.
- **In owner-hosted mode (B), the site proxy is the access control `atlasd`
  lacks.** Since `atlasd` has no auth and trusts its caller, the proxy must add
  what a public endpoint needs: origin checks, rate limiting / abuse controls,
  per-session budget caps (model calls cost money), and input size limits
  (≤ 6 images, ≤ 8 MiB each, mirroring the backend's own validation).

---

## 6. Degradation contract

The dock must never hard-fail the page. Defined fallbacks, in order:

1. `ATLAS_ENABLED=false` or no `ATLAS_API_URL` → **preview mode** (local canned
   answers). This is the default portfolio deploy.
2. `atlasd` unreachable / timeout → preview mode for that turn, with an honest
   "live Atlas is offline" affordance.
3. `atlasd` reachable but **no agent mounted** (`error` = no agent) → a clear
   "Atlas is online but has no agent attached" message, *not* a generic error and
   *not* a silent mock answer pretending to be live.
4. `error` mid-stream → surface a turn-level error; keep the panel usable.

Distinguishing case 3 from case 2 matters: it is the difference between "the
backend is down" and "the backend is up but the brain isn't plugged in," which is
exactly the hollow-broker reality of §1.

---

## 7. Readiness checklist

Status of the implementation in this branch:

- [x] `ATLAS_API_URL` / `ATLAS_ENABLED` / `ATLAS_REQUEST_TIMEOUT_MS` read
      server-side only; preview mode is the default when unset
      (`src/lib/agent/config.ts`).
- [x] `/api/agent/stream` proxies to `{ATLAS_API_URL}/v1/chat/stream` and forwards
      SSE incrementally (no full-body buffering).
- [x] A `conversation_id` is generated client-side, sent each turn, and registered
      idempotently via `POST /v1/conversations` — see
      [`atlas-contract.md` §2](atlas-contract.md).
- [x] The proxy speaks the `atlasd` event vocabulary (§4.1) and applies
      public-surface filtering (§4.2) — verified: `delegate_*` dropped, tool
      args/results and provenance stripped.
- [x] `done` is the single terminal event; `error`→`done(failed)` is handled;
      client disconnect aborts the upstream and stops quietly.
- [x] The degradation cases (§6) are implemented: disabled → preview, unreachable/
      timeout → preview, no-agent → upstream `error` surfaced.
- [x] No model keys or the `atlasd` URL ever reach the browser (§5).

Deferred (not blocking this increment):

- [ ] Topology selection (A vs B, §2) — pure configuration.
- [ ] Owner-hosted (B) hardening: origin checks, rate limiting, per-session budget
      caps (§5).
- [ ] Optional UX: render `thinking` / `tool_*` as a "working…" indicator.

---

## 8. References

- `atlas-contract.md` — the site-scoped wire contract (endpoints + SSE events).
- `architecture.md` — site runtime boundaries and the agent module layout.
- `Atlas-Desktop-Agent/Core-Desktop-Agent/docs/HTTP_CONTRACT.md` — **source of
  truth** for the backend wire contract (frozen v0.1.0).
- `Atlas-Desktop-Agent/README.md` — hollow-broker architecture and ecosystem.
