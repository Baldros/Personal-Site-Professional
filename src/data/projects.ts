export type Project = {
  name: string;
  status: string;
  year: string;
  /** External source, usually GitHub. `null` when the repo is private. */
  href: string | null;
  /** Route to a case study on this site, when one exists. */
  internalHref?: string;
  /** Exactly one project carries the featured slot on the home page. */
  featured?: boolean;
  body: string;
  tags: string[];
};

export const projects: Project[] = [
  {
    name: "Atlas Desktop Agent",
    status: "Shipped — v1 in progress",
    year: "2025 — 2026",
    href: "https://github.com/Baldros/Atlas-Desktop-Agent",
    internalHref: "/atlas",
    featured: true,
    body:
      "A local-first desktop AI assistant whose backend deliberately contains no AI. A pure-Go control plane brokers a pluggable crew of external agents over one language-agnostic contract, with an Electron desktop shell and a Flutter mobile client on the same wire.",
    tags: ["Go", "Electron", "Flutter", "Agent orchestration", "SSE"]
  },
  {
    name: "RagSystem",
    status: "Public repository",
    year: "2025",
    href: "https://github.com/Baldros/RagSystem",
    body:
      "Documentation crawler and RAG pipeline that turns technical documentation into a structured knowledge base for LLM usage.",
    tags: ["RAG", "Documentation", "Python", "LLM"]
  },
  {
    name: "EnterpriseSearch",
    status: "Public repository",
    year: "2025",
    href: "https://github.com/Baldros/EnterpriseSearch",
    body:
      "Search-oriented enterprise assistant work, aligned with document access, internal knowledge retrieval, and productivity systems.",
    tags: ["Search", "Enterprise AI", "Python"]
  },
  {
    name: "ARIS — DEJUR Assistant",
    status: "Public repository",
    year: "2025",
    href: "https://github.com/Baldros/ARIS---DEJUR-Assistent",
    body:
      "Legal assistant for corporate legal teams, focused on applied agent workflows and domain-specific support.",
    tags: ["Legal AI", "Agents", "Python"]
  },
  {
    name: "CLI-Functions",
    status: "Public repository",
    year: "2024 — 2026",
    href: "https://github.com/Baldros/CLI-Functions",
    body:
      "Reusable CLI integrations that extend agent capabilities across email, calendar, Drive, YouTube, Steam, and local workflows.",
    tags: ["CLI", "Automation", "Agent tools"]
  },
  {
    name: "EnglishTutor",
    status: "Public repository",
    year: "2024",
    href: "https://github.com/Baldros/EnglishTutor",
    body:
      "Conversational language tutor prototype focused on teaching English with adaptive dialogue and assistant-led learning.",
    tags: ["Conversational AI", "Education", "Python"]
  }
];

export const featuredProject = projects.find((project) => project.featured);
export const otherProjects = projects.filter((project) => !project.featured);
