import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { answerAtlasPrompt } from "../lib/agent/answers";

type ChatMessage = {
  role: "user" | "atlas";
  content: string;
};

type AgentEvent = {
  type: string;
  delta?: string;
};

const starterPrompts = [
  "What is Andre's strongest professional signal?",
  "How should the LinkedIn API fit this site?",
  "Which projects show agent engineering?"
];

function parseEventBlock(block: string): AgentEvent | null {
  const dataLine = block.split("\n").find((line) => line.startsWith("data: "));

  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine.replace("data: ", "")) as AgentEvent;
  } catch {
    return { type: "PARSE_ERROR" };
  }
}

function parseSse(text: string): AgentEvent[] {
  return text
    .split("\n\n")
    .map(parseEventBlock)
    .filter((event): event is AgentEvent => Boolean(event));
}

export default function AtlasDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLSpanElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "atlas",
      content:
        "Ask about Andre's experience, AI projects, GitHub evidence, or the official API roadmap."
    }
  ]);

  const canSend = useMemo(() => input.trim().length > 1 && !loading, [input, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function updateLastAtlasMessage(updater: string | ((content: string) => string)) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];

      if (!last || last.role !== "atlas") {
        return current;
      }

      next[next.length - 1] = {
        ...last,
        content: typeof updater === "function" ? updater(last.content) : updater
      };

      return next;
    });
  }

  async function readAgentResponse(response: Response, prompt: string) {
    if (!response.body) {
      const text = await response.text();
      const content = parseSse(text)
        .filter((event) => event.type === "TEXT_MESSAGE_CONTENT")
        .map((event) => event.delta ?? "")
        .join("");

      updateLastAtlasMessage(content || answerAtlasPrompt(prompt));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let received = "";

    const applyBlock = (block: string) => {
      const event = parseEventBlock(block);

      if (event?.type !== "TEXT_MESSAGE_CONTENT") return;

      const delta = event.delta ?? "";
      received += delta;
      updateLastAtlasMessage((current) => `${current}${delta}`);
    };

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      blocks.forEach(applyBlock);
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      applyBlock(buffer);
    }

    if (!received) {
      updateLastAtlasMessage(answerAtlasPrompt(prompt));
    }
  }

  async function sendMessage(value = input) {
    const prompt = value.trim();
    if (!prompt || loading) return;

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: prompt }, { role: "atlas", content: "" }]);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });

      if (!response.ok) throw new Error("Atlas endpoint failed");

      await readAgentResponse(response, prompt);
    } catch {
      updateLastAtlasMessage(answerAtlasPrompt(prompt));
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
        aria-controls="atlas-panel"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {open && (
        <section className="atlas__panel" id="atlas-panel" aria-label="Atlas assistant preview">
          <header className="atlas__header">
            <div>
              <span>
                <Sparkles size={15} />
                Atlas
              </span>
              <p>Portfolio intelligence layer</p>
            </div>
            <button type="button" aria-label="Close Atlas" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>

          <div className="atlas__messages" aria-live="polite" aria-busy={loading}>
            {messages.map((message, index) => (
              <p className={`atlas__message atlas__message--${message.role}`} key={`${message.role}-${index}`}>
                {message.content || "Thinking..."}
              </p>
            ))}
            <span className="atlas__message-end" ref={messagesEndRef} />
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
              ref={inputRef}
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
