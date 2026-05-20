export type AgentEventType =
  | "RUN_STARTED"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "RUN_FINISHED";

export type AgentEvent = {
  type: AgentEventType;
  runId: string;
  messageId?: string;
  delta?: string;
};

const createId = (prefix: string) => {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${value}`;
};

export function toAgentTextRun(answer: string): AgentEvent[] {
  const runId = createId("run");
  const messageId = createId("msg");
  const chunks = answer.match(/.{1,48}(\s|$)/g) ?? [answer];

  return [
    { type: "RUN_STARTED", runId },
    { type: "TEXT_MESSAGE_START", runId, messageId },
    ...chunks.map((delta) => ({
      type: "TEXT_MESSAGE_CONTENT" as const,
      runId,
      messageId,
      delta
    })),
    { type: "TEXT_MESSAGE_END", runId, messageId },
    { type: "RUN_FINISHED", runId }
  ];
}
