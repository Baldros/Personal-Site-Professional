# Atlas Wire Contract (site-scoped)

The exact `atlasd` HTTP surface this site codes against. This is a **faithful,
site-scoped restatement** of the backend's frozen contract
(`Atlas-Desktop-Agent/Core-Desktop-Agent/docs/HTTP_CONTRACT.md`, v0.1.0). That
file is the **source of truth**; if anything here drifts from it, fix it here.

Scope: only the endpoints the site's Atlas dock needs (health, model selection,
conversations, chat streaming). The backend also exposes voice (`/v1/voice/*`) and
automation (`/v1/automation/*`) surfaces — **out of scope for the site** and
deliberately omitted. See `atlas-integration.md` for *how* the site uses this.

---

## 1. Transport & conventions

- **Base URL:** `{ATLAS_API_URL}`, default `http://127.0.0.1:8000`. Loopback-only
  by default (`ATLAS_API_HOST` / `ATLAS_API_PORT`).
- **Auth:** none. `atlasd` trusts its caller (local-first). The site's server
  proxy is the access-control layer (`atlas-integration.md §5`).
- **CORS:** `allow_origins=["*"]`, `allow_credentials=false`. Irrelevant to the
  site, which calls server-to-server, not from the browser.
- **Content type:** JSON in/out, except `/v1/chat/stream` which is
  `text/event-stream` (SSE).
- **Versioning:** the backend app identifies as `Atlas Logic API` `0.1.0`; the
  HTTP surface is wire-frozen for compatibility across the Python→Go rewrite.

### 1.1 Error model — two shapes

| Shape | When | Body |
| --- | --- | --- |
| Handled error | `HTTPException` (e.g. 404, 500) | `{ "detail": "<string>" }` |
| Validation error | malformed/missing body fields | **422** `{ "detail": [ { "loc": [...], "msg": "...", "type": "..." } ] }` |

The proxy should handle both: a `string` detail and an array-of-objects detail.

### 1.2 `agent_ready` / `init_error`

`/health` and the model endpoints carry `agent_ready` (bool) and
`init_error` (string|null). `agent_ready:false` / a non-null `init_error` (e.g.
`"no root agent mounted"`) is the **broker-up-but-no-brain** state — the site
must read it to distinguish "offline" from "no agent" (`atlas-integration.md §6`).

---

## 2. Endpoints the site uses

| Method | Path | Body | Success | Notes |
| --- | --- | --- | --- | --- |
| GET | `/health` | — | `200 HealthResponse` | liveness + `agent_ready` |
| GET | `/v1/models/providers` | — | `200 ProvidersResponse` | human labels, key-gated |
| GET | `/v1/models?provider=<label>` | — | `200 ProviderModelsResponse` | `422` if `provider` missing; `404` unknown provider |
| GET | `/v1/conversations?limit=&offset=` | — | `200 {conversations:[Conversation]}` | active only, `pinned DESC, updated_at DESC` |
| POST | `/v1/conversations` | `CreateConversationRequest` | `200 Conversation` | idempotent (`INSERT OR IGNORE`) |
| GET | `/v1/conversations/{id}` | — | `200 Conversation + messages:[]` | `messages` is **always `[]`** (§2.1) |
| PATCH | `/v1/conversations/{id}` | `{title?, pinned?}` | `200 {status:"success"}` | `400` if no fields |
| DELETE | `/v1/conversations/{id}` | — | `200 {status:"success"}` | soft delete; `404` if missing |
| POST | `/v1/conversations/{id}/restore` | — | `200 {status:"success"}` | `404` if missing |
| POST | `/v1/chat` | `ChatRequest` | `200 ChatResponse` | synchronous (non-streaming) |
| POST | `/v1/chat/stream` | `ChatStreamRequest` | `200 text/event-stream` | **primary path for the dock** (§3) |

### 2.1 Conversation lifecycle for the dock

1. On a new session, the site creates/owns a `conversation_id`. `POST
   /v1/conversations` with `{conversation_id, title?, provider?, model?}` is
   idempotent — calling it again with the same id is safe.
2. Every chat turn sends that `conversation_id`.
3. `GET /v1/conversations/{id}` returns `"messages": []` **by contract** — message
   bodies are not exposed over this route. The site cannot rehydrate history from
   the backend; it keeps its own client-side transcript for the session.

```json
// Conversation
{
  "conversation_id": "c-123",
  "title": "Chat - 2026-06-03 14:30",
  "subtitle": "first user message…",
  "started_at": "2026-06-03T14:30:00+00:00",
  "updated_at": "2026-06-03T14:31:10+00:00",
  "provider": "OpenAI",
  "model": "gpt-4o",
  "status": "active",
  "pinned": 0
}
```

### 2.2 Models / providers

- `GET /v1/models/providers` →
  `{ providers: ["Ollama (Local)", "OpenAI (ChatGPT)", ...], current_provider, current_model, init_error }`.
  `providers` are **human labels**, not ids. A provider appears only if locally
  runnable (`Ollama (Local)`, always present) or has a configured API key.
- `GET /v1/models?provider=<label>` →
  `{ provider, models: [...], selected_model, init_error }`. A missing `provider`
  query param is a **422** (required); an unknown provider is **404**.
- The site selects a `provider`/`model` **by label** and passes them on the chat
  request. It never holds the provider key — `atlasd` authenticates.

---

## 3. Chat

### 3.1 `POST /v1/chat/stream` → `text/event-stream` (primary)

Request body (`ChatStreamRequest`, same shape as `ChatRequest`):

```json
{
  "conversation_id": "c-123",
  "message": "hi",
  "images": [],
  "provider": null,
  "model": null,
  "effort_mode": false,
  "explicit_integration_name": null,
  "explicit_integration_parameter": null,
  "explicit_integration_command": null
}
```

- **Validation:** must include a non-empty `message` **or** ≥ 1 image; at most
  **6** images, each ≤ **8 MiB** decoded → else **422** (returned as JSON *before*
  streaming starts).
- `provider` / `model` are nullable labels; null means "use the backend's current
  selection."
- `effort_mode` (bool, default `false`) is a **routing toggle**, *not* a
  reasoning-effort or answer-quality setting: `true` forces the supervised path
  (always route to the `TeamLeader`); `false` lets the broker pick direct vs
  supervised. The site should treat it as an advanced/off-by-default flag.
- The `explicit_integration_*` fields are advanced direct-invocation hooks; the
  public dock leaves them `null`.

**SSE framing** (exact bytes per event):

```
event: <type>\n
data: <compact-json>\n
\n
```

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`, `X-Accel-Buffering: no`.

A **malformed** request still returns a JSON **422** (validation runs first). A
**valid** request that then fails (e.g. no agent) returns **200** and reports the
failure *inside* the stream as `error` then `done(failed)` — not as an HTTP error.

### 3.2 Event vocabulary

Every payload carries `conversation_id`; the chat route also adds `provider` and
`model` to each event (except the pre-init `error`/`done`, which carry only
`conversation_id`). Provenance fields (`agent?`, `delegation_id?`, `message_id?`)
are additive and optional — unknown keys must be ignored by clients.

| `event:` | `data` payload | Notes |
| --- | --- | --- |
| `thinking` | `{conversation_id, text, provider, model, agent?, delegation_id?}` | reasoning/progress text |
| `answer_chunk` | `{conversation_id, text, provider, model, message_id?, agent?, delegation_id?}` | **streamed reply delta** |
| `answer` | `{conversation_id, text, ...}` | full message text (optional/alternative) |
| `message_end` | `{conversation_id, message_id, final, provider, model, agent?, delegation_id?}` | closes one assistant message; `final ∈ true\|false`; **non-terminal** |
| `tool_start` | `{conversation_id, name, args, call_id?, tool?, provider, model, agent?, delegation_id?}` | `args` is a JSON-encoded string |
| `tool_end` | `{conversation_id, result, name?, call_id?, tool?, status?, provider, model, agent?, delegation_id?}` | `status ∈ completed\|error` |
| `delegate_start` | `{conversation_id, delegation_id, agent, provider, model}` | a delegation block began |
| `delegate_end` | `{conversation_id, delegation_id, agent, provider, model}` | the block closed |
| `error` | `{conversation_id, text, provider?, model?, agent?, delegation_id?}` | followed by `done(failed)` |
| `done` | `{conversation_id, status, provider?, model?}` | **terminal**; `status ∈ completed\|failed\|cancelled` |

**Ordering & termination:** zero or more of
`thinking` / `answer_chunk` / `answer` / `message_end` / `tool_*` /
`delegate_*`, then **exactly one terminal `done`**. `message_end` and
`delegate_*` are **non-terminal** however many appear — `done` is the single turn
terminator. On failure: `error` then `done(failed)`. On client disconnect: the
server cancels and emits `done(cancelled)`.

> **Maturity flag.** `delegate_start` / `delegate_end` / `message_end` and the
> provenance fields are a **frozen contract target** the current backend build
> does **not** yet emit (supervised-turn provenance, `HTTP_CONTRACT.md §5.2`). A
> simple turn today looks like: `thinking → answer_chunk(s) → done`. Build the
> client to the full table so no backend change forces a client change, but do not
> assume the delegation/message events appear yet.

**Minimal real stream (today):**

```
event: thinking
data: {"conversation_id":"c-1","text":"planning","provider":"<p>","model":"<m>"}

event: answer_chunk
data: {"conversation_id":"c-1","text":"echo: hi","provider":"<p>","model":"<m>"}

event: done
data: {"conversation_id":"c-1","status":"completed","provider":"<p>","model":"<m>"}
```

**No-agent stream (broker up, no brain mounted):**

```
event: error
data: {"conversation_id":"c-1","text":"No agent is available to handle the request."}

event: done
data: {"conversation_id":"c-1","status":"failed"}
```

### 3.3 `POST /v1/chat` → `ChatResponse` (synchronous, optional)

Same request shape. Returns the streaming path collapsed into one reply:

```json
{ "conversation_id": "c-123", "reply": "hello", "provider": "OpenAI", "model": "gpt-4o" }
```

- Concatenates `answer_chunk`s (or uses a final `answer`); raises **500**
  `{detail}` on `error`. Validation is identical (`message` or image required,
  ≤ 6 images). Useful for non-streaming contexts; the dock should prefer
  `/v1/chat/stream` for live tokens.

### 3.4 Image attachments (`images[]`)

`{ id?, name?, mime_type (req), data (req, base64 or data-URL), size?, width?,
height? }`. Allowed MIME: `image/jpeg|png|webp|gif` (`image/jpg` → `image/jpeg`).
≤ 8 MiB decoded each, ≤ 6 per message. Data-URL prefix (`data:...,`) is stripped;
payload must be valid base64 (else 422/400).

---

## 4. What the site must NOT assume

- **No history rehydration.** `messages` is always `[]` on the conversation route
  (§2.1). Keep a client-side transcript.
- **No auth tokens.** There is no session/token model; do not send `Authorization`.
- **No voice / automation.** `/v1/voice/*` and `/v1/automation/*` exist in the
  backend but are out of scope for the site (`atlas-integration.md`).
- **No model keys over the wire.** `/v1/settings/api-keys` returns *status only*,
  never secret values; the site never needs raw keys.
- **`done` ≠ end-of-body for correctness.** Treat the `done` event as the terminal
  signal, not the TCP/stream close.

---

## 5. Reference

Source of truth: `Atlas-Desktop-Agent/Core-Desktop-Agent/docs/HTTP_CONTRACT.md`
(frozen v0.1.0) — §3 (health/models/settings), §4 (conversations), §5 (chat + SSE
+ supervised provenance). Keep this file synchronized with it.
