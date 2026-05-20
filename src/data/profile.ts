export const profile = {
  name: "André Amorim",
  handle: "Baldros",
  role: "Software & AI Engineer",
  location: "Rio de Janeiro, Brazil",
  avatarUrl: "https://avatars.githubusercontent.com/u/114627100?v=4",
  headline:
    "I design intelligent software systems at the intersection of AI agents, automation, data science, and engineering workflows.",
  summary:
    "Software Engineer and Data Scientist specialized in Artificial Intelligence, business automation, and digital transformation. Currently modernizing corporate systems at Deepmath, with focus on scalable architecture, CRM intelligence, and agentic integrations.",
  philosophy:
    "Labor omnia vincit, per aspera ad astra.",
  links: {
    github: "https://github.com/Baldros",
    linkedin: "https://www.linkedin.com/in/andr%C3%A9-amorim-73943bb7/",
    lattes: "https://lattes.cnpq.br/9153087289739313",
    email: "mailto:amorim.techconsult@gmail.com"
  },
  proofPoints: [
    "AI systems and agent tooling",
    "Corporate automation and BI",
    "Remote sensing and environmental data",
    "Engineering simulation research"
  ],
  metrics: [
    { label: "Public GitHub repositories", value: "58+" },
    { label: "AI and data focus", value: "4 yrs" },
    { label: "Professional languages", value: "PT / EN" }
  ]
} as const;

export const expertise = [
  {
    title: "Agentic AI",
    accent: "mineral",
    body:
      "LLM integrations, tool-use agents, MCP context access, and workflows that connect model reasoning to real software systems.",
    items: ["LangChain", "LangGraph", "MCP", "LLM orchestration"]
  },
  {
    title: "Software Architecture",
    accent: "moss",
    body:
      "Modernization of legacy systems, CRM architecture, internal tools, and maintainable application layers for growing teams.",
    items: ["Python", "TypeScript", "Systems integration", "Automation"]
  },
  {
    title: "Data Science",
    accent: "gold",
    body:
      "Predictive modeling, statistical analysis, BI dashboards, and decision support systems grounded in business context.",
    items: ["PyTorch", "TensorFlow", "Scikit-learn", "Power BI"]
  },
  {
    title: "Scientific Computing",
    accent: "clay",
    body:
      "Remote sensing, atmospheric analysis, CFD-adjacent research, mesh optimization, and environmental intelligence.",
    items: ["Google Earth Engine", "R", "SQL", "Satellite data"]
  }
] as const;
