import type { APIRoute } from "astro";
import { answerAtlasPrompt } from "../../../lib/agent/answers";
import { toAgentTextRun } from "../../../lib/agent/agui";

export const prerender = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const POST: APIRoute = async ({ request }) => {
  const payload = await request.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message : "";
  const answer = answerAtlasPrompt(message);
  const events = toAgentTextRun(answer);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
        );
        await delay(event.type === "TEXT_MESSAGE_CONTENT" ? 24 : 4);
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
};
