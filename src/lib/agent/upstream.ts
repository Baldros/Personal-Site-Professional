// atlasd client — server-side only.
//
// Opens a chat turn against the Atlas backend and yields sanitized public
// events (lib/agent/protocol.ts). Implements the connection boundary from
// docs/atlas-integration.md §3-§5: it is the ONLY code that reaches atlasd, it
// strips internal provenance / raw tool I/O before anything reaches the browser
// (§4.2), and it raises AtlasUnreachableError so the proxy can degrade to
// preview (§6). Never import this from a client island.

import type { AtlasConfig } from "./config";
import { createSseParser, type AtlasEvent, type SseFrame } from "./protocol";

export class AtlasUnreachableError extends Error {}

export type ChatTurn = {
  conversationId: string;
  message: string;
  provider: string | null;
  model: string | null;
};

/**
 * Public-surface filtering (docs/atlas-integration.md §4.2): map one raw atlasd
 * frame to a sanitized public event, or null to drop it. Provenance (agent,
 * delegation_id, message_id), conversation_id, provider/model, raw tool args and
 * results, and delegation block structure are intentionally never forwarded.
 */
function sanitize(frame: SseFrame): AtlasEvent | null {
  const data = frame.data;
  const text = typeof data.text === "string" ? data.text : undefined;
  const name = typeof data.name === "string" ? data.name : undefined;
  const status = typeof data.status === "string" ? data.status : undefined;

  switch (frame.event) {
    case "answer_chunk":
    case "answer":
      return { type: frame.event, text: text ?? "" };
    case "thinking":
      return { type: "thinking", text: text ?? "" };
    case "tool_start":
      return { type: "tool_start", name };
    case "tool_end":
      return { type: "tool_end", name, status };
    case "message_end":
      return { type: "message_end", final: Boolean(data.final) };
    case "error":
      return { type: "error", text: text ?? "Atlas error" };
    case "done":
      return { type: "done", status: status ?? "completed" };
    // delegate_start / delegate_end and anything unknown: internal, not public.
    default:
      return null;
  }
}

function buildChatBody(turn: ChatTurn) {
  return {
    conversation_id: turn.conversationId,
    message: turn.message,
    images: [],
    provider: turn.provider,
    model: turn.model,
    effort_mode: false,
    explicit_integration_name: null,
    explicit_integration_parameter: null,
    explicit_integration_command: null
  };
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
      const msg = (detail[0] as { msg?: unknown }).msg;
      if (typeof msg === "string") return msg;
    }
  } catch {
    // fall through to a generic message
  }
  return `Atlas request failed (${response.status}).`;
}

/**
 * Stream one chat turn. Yields sanitized events ending in a terminal `done`.
 * Throws AtlasUnreachableError on network failure or inactivity timeout (the
 * proxy degrades to preview). Returns silently if the client disconnected.
 */
export async function* streamAtlas(
  cfg: AtlasConfig,
  turn: ChatTurn,
  external?: AbortSignal
): AsyncGenerator<AtlasEvent> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, cfg.timeoutMs);
  };
  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  const clientGone = () => Boolean(external?.aborted) && !timedOut;

  arm();
  try {
    // Idempotent conversation registration (contract §2.1).
    await fetch(`${cfg.baseUrl}/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: turn.conversationId }),
      signal: controller.signal
    }).catch((err) => {
      throw new AtlasUnreachableError(`atlasd unreachable: ${String(err)}`);
    });
    arm();

    const response = await fetch(`${cfg.baseUrl}/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(buildChatBody(turn)),
      signal: controller.signal
    });
    arm();

    if (!response.ok || !response.body) {
      // A reachable backend that rejected the request (e.g. 422). Surface it as
      // a turn error rather than degrading to preview.
      const detail = response.body ? await readErrorDetail(response) : `Atlas request failed (${response.status}).`;
      yield { type: "error", text: detail };
      yield { type: "done", status: "failed" };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    let sawDone = false;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      arm();
      for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
        const event = sanitize(frame);
        if (!event) continue;
        if (event.type === "done") sawDone = true;
        yield event;
      }
    }

    if (!sawDone) yield { type: "done", status: "completed" };
  } catch (err) {
    if (clientGone()) return; // client disconnected — stop quietly
    if (err instanceof AtlasUnreachableError) throw err;
    throw new AtlasUnreachableError(`atlasd stream failed: ${String(err)}`);
  } finally {
    if (timer) clearTimeout(timer);
    if (external) external.removeEventListener("abort", onExternalAbort);
  }
}
