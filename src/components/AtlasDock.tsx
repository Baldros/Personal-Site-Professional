import { useMemo, useState } from "react";
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

function parseSse(text: string): AgentEvent[] {
  return text
    .split("\n\n")
    .map((block) => block.split("\n").find((line) => line.startsWith("data: ")))
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line!.replace("data: ", "")) as AgentEvent;
      } catch {
        return { type: "PARSE_ERROR" };
      }
    });
}

export default function AtlasDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "atlas",
      content:
        "Ask about Andre's experience, AI projects, GitHub evidence, or the official API roadmap."
    }
  ]);

  const canSend = useMemo(() => input.trim().length > 1 && !loading, [input, loading]);

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

      const text = await response.text();
      const content = parseSse(text)
        .filter((event) => event.type === "TEXT_MESSAGE_CONTENT")
        .map((event) => event.delta ?? "")
        .join("");

      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "atlas", content: content || answerAtlasPrompt(prompt) };
        return next;
      });
    } catch {
      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "atlas", content: answerAtlasPrompt(prompt) };
        return next;
      });
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
        <section className="atlas__panel" aria-label="Atlas assistant preview">
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
