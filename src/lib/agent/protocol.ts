// Atlas event protocol — isomorphic (browser + server), no runtime deps.
//
// This is the public, sanitized event vocabulary the site speaks on
// `/api/agent/stream`. It mirrors the atlasd SSE vocabulary
// (docs/atlas-contract.md §3.2) so the dock parses one protocol whether the
// turn is served live by atlasd or by local preview. The server proxy is the
// only thing that ever sees raw atlasd frames; it sanitizes them into these
// shapes (see lib/agent/upstream.ts) before they reach the browser.

export type AtlasEventType =
  | "status" // proxy-level meta: live vs preview/offline (not an atlasd event)
  | "thinking"
  | "answer_chunk"
  | "answer"
  | "message_end"
  | "tool_start"
  | "tool_end"
  | "error"
  | "done";

export type AtlasEvent = {
  type: AtlasEventType | string;
  /** answer_chunk / answer / thinking / error text */
  text?: string;
  /** tool name (tool_start / tool_end) */
  name?: string;
  /** tool_end status (completed|error) or done status (completed|failed|cancelled) */
  status?: string;
  /** message_end: closes one assistant message */
  final?: boolean;
  /** status meta: how this turn is being served */
  mode?: "live" | "preview";
  /** status meta: why preview (disabled|offline) */
  reason?: string;
};

/** Encode one event as an SSE frame: `event: <type>\ndata: <json>\n\n`. */
export function encodeSseEvent(event: AtlasEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export type SseFrame = { event: string; data: Record<string, unknown> };

/**
 * Stateful incremental SSE parser. Feed it decoded text chunks as they arrive;
 * it returns whatever complete `event:`/`data:` frames are now available and
 * keeps the trailing partial frame buffered. Works the same in Node and the
 * browser.
 */
export function createSseParser() {
  let buffer = "";

  function parseFrame(raw: string): SseFrame | null {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of raw.split("\n")) {
      const clean = line.replace(/\r$/, "");
      if (clean.startsWith("event:")) {
        event = clean.slice(6).trim();
      } else if (clean.startsWith("data:")) {
        dataLines.push(clean.slice(5).replace(/^ /, ""));
      }
    }
    if (dataLines.length === 0) return null;
    try {
      const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      return { event, data: data ?? {} };
    } catch {
      return { event, data: {} };
    }
  }

  return {
    push(chunk: string): SseFrame[] {
      buffer += chunk;
      const frames: SseFrame[] = [];
      let index = buffer.indexOf("\n\n");
      while (index !== -1) {
        const raw = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const frame = parseFrame(raw);
        if (frame) frames.push(frame);
        index = buffer.indexOf("\n\n");
      }
      return frames;
    }
  };
}

/** Generate a unique id with a graceful fallback when crypto is unavailable. */
export function createId(prefix: string): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${value}`;
}

/**
 * Build a preview turn (local canned answer) in the Atlas vocabulary, so the
 * browser consumes the exact same protocol whether live or preview.
 */
export function previewEvents(answer: string, reason: string): AtlasEvent[] {
  const chunks = answer.match(/.{1,48}(\s|$)/g) ?? [answer];
  return [
    { type: "status", mode: "preview", reason },
    ...chunks.map<AtlasEvent>((text) => ({ type: "answer_chunk", text })),
    { type: "done", status: "completed" }
  ];
}
