import type { APIRoute } from "astro";
import { answerAtlasPrompt } from "../../../lib/agent/answers";
import { getAtlasConfig } from "../../../lib/agent/config";
import { encodeSseEvent, previewEvents, type AtlasEvent } from "../../../lib/agent/protocol";
import { streamAtlas, AtlasUnreachableError } from "../../../lib/agent/upstream";

export const prerender = false;

// Server-side proxy between the browser dock and the Atlas backend (atlasd).
// The browser never reaches atlasd directly (docs/atlas-integration.md §3): this
// route holds the base URL, forwards the SSE stream, and applies the four-case
// degradation contract (§6). It always speaks the public Atlas event protocol
// (lib/agent/protocol.ts), live or preview, so the client parses one vocabulary.

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no"
} as const;

type ChatPayload = {
  message?: unknown;
  conversationId?: unknown;
  provider?: unknown;
  model?: unknown;
};

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

export const POST: APIRoute = async ({ request }) => {
  const payload = (await request.json().catch(() => ({}))) as ChatPayload;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const conversationId = asString(payload.conversationId) ?? `c-${Date.now()}`;
  const provider = asString(payload.provider);
  const model = asString(payload.model);

  const cfg = getAtlasConfig();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AtlasEvent) => controller.enqueue(encoder.encode(encodeSseEvent(event)));
      const sendPreview = (reason: string) => {
        for (const event of previewEvents(answerAtlasPrompt(message), reason)) send(event);
      };

      try {
        if (!message) {
          send({ type: "error", text: "Empty message." });
          send({ type: "done", status: "failed" });
          return;
        }

        if (!cfg.enabled) {
          // Case 1: Atlas disabled / no base URL → preview mode (default deploy).
          sendPreview("disabled");
          return;
        }

        try {
          send({ type: "status", mode: "live" });
          for await (const event of streamAtlas(cfg, { conversationId, message, provider, model }, request.signal)) {
            send(event);
          }
        } catch (error) {
          // Case 2: atlasd unreachable / timeout → preview for this turn.
          if (error instanceof AtlasUnreachableError) {
            sendPreview("offline");
            return;
          }
          throw error;
        }
      } catch {
        send({ type: "error", text: "Atlas failed to respond." });
        send({ type: "done", status: "failed" });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: SSE_HEADERS });
};
