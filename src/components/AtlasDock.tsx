import { useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { answerAtlasPrompt } from "../lib/agent/answers";
import { createId, createSseParser } from "../lib/agent/protocol";

type ChatMessage = {
  role: "user" | "atlas";
  content: string;
};

type TurnMode = "live" | "preview" | null;

const starterPrompts = [
  "What is Andre's strongest professional signal?",
  "How should the LinkedIn API fit this site?",
  "Which projects show agent engineering?"
];

function statusLabel(mode: TurnMode): string {
  if (mode === "live") return "Live · Atlas backend";
  if (mode === "preview") return "Preview mode";
  return "Portfolio intelligence layer";
}

export default function AtlasDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TurnMode>(null);
  const conversationId = useRef<string>(createId("c"));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "atlas",
      content:
        "Ask about Andre's experience, AI projects, GitHub evidence, or the official API roadmap."
    }
  ]);

  const canSend = useMemo(() => input.trim().length > 1 && !loading, [input, loading]);

  function updateLastAtlas(content: string) {
    setMessages((current) => {
      const next = [...current];
      next[next.length - 1] = { role: "atlas", content };
      return next;
    });
  }

  async function sendMessage(value = input) {
    const prompt = value.trim();
    if (!prompt || loading) return;

    setInput("");
    setLoading(true);
    setMode(null);
    setMessages((current) => [...current, { role: "user", content: prompt }, { role: "atlas", content: "" }]);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, conversationId: conversationId.current })
      });

      if (!response.ok || !response.body) throw new Error("Atlas endpoint failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser();
      let answer = "";
      let errorText = "";

      for (;;) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        for (const frame of parser.push(decoder.decode(chunk, { stream: true }))) {
          const data = frame.data as { text?: string; mode?: string; status?: string };
          switch (frame.event) {
            case "status":
              if (data.mode === "live" || data.mode === "preview") setMode(data.mode);
              break;
            case "answer_chunk":
            case "answer":
              answer += data.text ?? "";
              updateLastAtlas(answer);
              break;
            case "error":
              errorText = data.text ?? "Atlas error";
              break;
            case "done":
              if (data.status && data.status !== "completed" && !answer) {
                updateLastAtlas(errorText || "Atlas could not answer this turn.");
              }
              break;
            default:
              break; // thinking / tool_* / message_end: not rendered in this dock
          }
        }
      }

      if (!answer) updateLastAtlas(errorText || answerAtlasPrompt(prompt));
    } catch {
      // Last-resort client fallback if the proxy itself is unreachable.
      setMode("preview");
      updateLastAtlas(answerAtlasPrompt(prompt));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="atlas">
      <button
        className="atlas__launcher"
        type="button"
        aria-label={open ? "Close Atlas" : "Open Atlas"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {open && (
        <section className="atlas__panel" aria-label="Atlas assistant">
          <header className="atlas__header">
            <div>
              <span>
                <Sparkles size={15} />
                Atlas
              </span>
              <p data-mode={mode ?? undefined}>{statusLabel(mode)}</p>
            </div>
            <button type="button" aria-label="Close Atlas" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>

          <div className="atlas__messages">
            {messages.map((message, index) => (
              <p className={`atlas__message atlas__message--${message.role}`} key={`${message.role}-${index}`}>
                {message.content || "Thinking..."}
              </p>
            ))}
          </div>

          <div className="atlas__prompts">
            {starterPrompts.map((prompt) => (
              <button type="button" key={prompt} onClick={() => void sendMessage(prompt)} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="atlas__form" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Atlas"
              aria-label="Message Atlas"
            />
            <button type="submit" disabled={!canSend} aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
