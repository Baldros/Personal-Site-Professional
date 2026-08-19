/**
 * Atlas case-study content.
 *
 * Every number and quotation here was read out of E:\Atlas-Desktop-Agent
 * itself — README, the ADR chain under docs/v1, go.mod, the HTTP contract and
 * git history. Nothing is estimated.
 *
 * One deliberate omission: there are no performance figures anywhere on this
 * page. docs/v2/BENCHMARKING_ATLAS_AGENT_RUNTIME.md is a methodology playbook,
 * not a results report — no benchmark has actually been run, so publishing a
 * throughput or latency number would be inventing one.
 */

export type AtlasStat = { value: string; label: string; count?: number };
export type AtlasPlane = {
  id: string;
  name: string;
  direction: string;
  transport: string;
  body: string;
  events: string[];
};
export type AtlasClient = {
  name: string;
  role: string;
  stack: string;
  scale: string;
  body: string;
  highlight: string;
};
export type AtlasDecision = { title: string; body: string; evidence: string };

export const atlas = {
  name: "Atlas",
  fullName: "Atlas Desktop Agent",
  tagline: "A desktop AI assistant whose backend contains no AI.",
  repo: "https://github.com/Baldros/Atlas-Desktop-Agent",
  period: "Dec 2025 — Jul 2026",

  intro:
    "Atlas is a local-first, desktop-native AI assistant. The interesting part is not that it answers questions — it is where the intelligence is allowed to live. The backend owns none of it. It discovers, supervises and streams external agents, written in any language, over a single contract.",

  thesis: {
    quote:
      "Atlas separates intelligence from control-plane. All intelligence runs outside the backend as independent agents, attached LEGO-style by a manifest. The backend is a hollow broker: API gateway, persistence, agent catalog, scheduler and SSE relay — with zero in-process model code.",
    source: "README.md",
    gloss:
      "The consequence is that a broken, heavy or exotic agent cannot contaminate the host. You can plug in a Python agent, a Node agent or a binary, and the control plane neither knows nor cares — it validates the boundary and relays the stream."
  },

  stats: [
    { value: "291", label: "commits over 7 months", count: 291 },
    { value: "14,649", label: "lines of Go in the broker", count: 14649 },
    { value: "221", label: "Go test functions", count: 221 },
    { value: "3", label: "clients, one contract", count: 3 }
  ] as AtlasStat[],

  /** The narrative spine: what was rebuilt, and why. */
  arc: [
    {
      phase: "v0",
      period: "Dec 2025 — Apr 2026",
      title: "One deep agent, seventy-six tools",
      body:
        "The first Atlas was a Python/LangGraph monolith: a single agent holding every capability at once. A self-audit in April counted 76 registered tools across seven toolkits — web, YouTube, filesystem, Google, OS, terminal, Steam. It worked, and it was the wrong shape. Every new capability widened the same blast radius, and the tool list itself had started to degrade the model's choices.",
      marker: "76 tools in one agent"
    },
    {
      phase: "The decision",
      period: "Apr — Jun 2026",
      title: "Write the contract before the code",
      body:
        "Rather than refactor, the boundary was specified first: a six-document ADR chain that argued the split, then froze an HTTP contract and an agent ABI as normative documents. Golden fixtures captured from the running Python broker became the test oracle — observed behaviour was made the contract, so the replacement could be proven equivalent rather than assumed to be.",
      marker: "6 ADRs, 1 frozen contract"
    },
    {
      phase: "v1",
      period: "Jun — Jul 2026",
      title: "A hollow broker in pure Go",
      body:
        "The Python backend was deleted and replaced by atlasd: 14,649 lines of Go compiled with CGO_ENABLED=0 into a single static binary, with no LLM SDK of any kind — provider calls are hand-written HTTP. It ships inside the desktop installer as a bundled resource and also registers as a Windows Service so scheduled work fires with the app closed.",
      marker: "0 lines of model code in the host"
    }
  ],

  planes: [
    {
      id: "forward",
      name: "Plane A — forward",
      direction: "host → agent",
      transport: "subprocess (stdio, NDJSON)",
      body:
        "The host invokes an agent with a JSON-RPC call and reads back a newline-delimited stream of typed events, which it relays to the client over SSE. Tool calls are transparent on the wire, which is why the desktop UI can render what the agent is doing while it is doing it.",
      events: ["thinking", "tool_start", "tool_end", "answer_chunk", "final", "error"]
    },
    {
      id: "reverse",
      name: "Plane B — reverse",
      direction: "supervisor → host",
      transport: "stdio-duplex JSON-RPC",
      body:
        "The agent mounted as supervisor can call back into the host to enumerate and delegate to the rest of the crew. Delegation therefore travels through the control plane instead of around it — one place still owns lifecycle, credentials and provenance, even when agents are talking to each other.",
      events: ["list_agents", "delegate"]
    }
  ] as AtlasPlane[],

  clients: [
    {
      name: "atlasd",
      role: "Control plane",
      stack: "Go 1.26 · chi · modernc/sqlite · go-keyring",
      scale: "14,649 lines · 221 tests",
      body:
        "API gateway, SQLite persistence, agent catalog and lifecycle, cron/interval/one-shot scheduler, SSE relay. Six direct dependencies in total.",
      highlight: "One static binary, two modes: interactive sidecar, or a Windows Service under the SCM."
    },
    {
      name: "Desktop shell",
      role: "Primary client",
      stack: "Electron 42 · React 19 · Tailwind 4 · Radix",
      scale: "14,439 lines of TypeScript",
      body:
        "Spawns and health-polls the backend, renders streamed tool calls and thinking blocks, and feature-detects optional backend surfaces so a panel simply does not appear until the contract advertises it.",
      highlight: "The renderer is CSP-locked to localhost — it cannot reach the internet at all."
    },
    {
      name: "Mobile companion",
      role: "Second client",
      stack: "Flutter · Dart 3.12 · Material 3",
      scale: "7,864 lines of Dart",
      body:
        "Talks to exactly the same HTTP contract, selectable at build time between mock, direct HTTP and an SSH tunnel.",
      highlight:
        "The SSH tunnel is implemented inside the app — ordered endpoint failover, health watchdog, auto-reconnect — so the phone reaches a loopback-bound desktop backend with no ngrok, no Cloudflare, no relay service."
    }
  ] as AtlasClient[],

  decisions: [
    {
      title: "No LLM SDK in the host",
      body:
        "Provider calls are plain HTTP written by hand. Five providers are wired — OpenAI, Anthropic, xAI, Gemini and local Ollama — and the host only ever calls a model for one internal job: summarising memory. The conversational turn belongs to the agent.",
      evidence: "internal/models/providers/"
    },
    {
      title: "A static binary, enforced by CI",
      body:
        "CGO_ENABLED=0, no gcc, no interpreter bundle. This is not a preference stated in a README — the CI pipeline builds with the flag explicitly to validate the invariant on every push, alongside go vet and a race-detector test run.",
      evidence: ".github/workflows/ci.yml"
    },
    {
      title: "Cross-turn memory belongs to the host",
      body:
        "One rule draws the line everywhere: intra-turn state — the reasoning loop, the tool messages inside a single invocation — is the agent's and dies with the call. Anything that must survive between user messages is the host's. The same rule reappears in the ABI, in the memory subsystem and in delegation.",
      evidence: "internal/memory/"
    },
    {
      title: "Compact context early, on purpose",
      body:
        "The summary buffer triggers at 25% of the window rather than the industry-typical 85%, with every budget expressed as an integer percentage so the arithmetic is deterministic. The reason is stated in the source: large models reward keeping raw fidelity, but small local models degrade badly on long context, and Atlas has to serve both.",
      evidence: "internal/memory/summarybuffer.go"
    }
  ] as AtlasDecision[],

  status: {
    shipped: [
      "Phases 1 through 7 complete",
      "Signed-off installer built 22 Jun 2026 — 116 MB, backend bundled",
      "Scheduler live in daemon mode, running as a Windows Service",
      "/v1/automation/* jobs, runs, settings and notifications over HTTP",
      "Per-turn token accounting: real provider usage kept separate from estimated tool weight"
    ],
    outstanding: [
      "UI panels for jobs, runs and notifications",
      "Email and remaining delivery channels",
      "Retries, max_steps and read-only enforcement",
      "a2a and mcp transport adapters (reserved in the ABI, not wired)"
    ],
    caveat:
      "The broker hosts no intelligence itself: live chat and scheduled work both require external agent binaries with enabled manifests. That is the design, not a gap — but it does mean the backend alone does nothing you would recognise as an assistant."
  },

  stack: [
    "Go",
    "SQLite",
    "chi",
    "Electron",
    "React 19",
    "TypeScript",
    "Tailwind",
    "Flutter",
    "Dart",
    "SSE",
    "JSON-RPC",
    "OpenAI",
    "Anthropic",
    "Gemini",
    "xAI",
    "Ollama"
  ]
} as const;
