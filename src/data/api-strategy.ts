export const apiPlatforms = [
  {
    name: "LinkedIn",
    posture: "First integration candidate",
    summary:
      "Best fit for the professional portfolio: OAuth identity plus personal profile publishing through Share on LinkedIn.",
    capabilities: [
      "Sign in with LinkedIn",
      "Personal posts via w_member_social",
      "Text, article, and image sharing",
      "Server-side OAuth token handling"
    ],
    constraints: [
      "No consumer feed reading",
      "Company pages require Marketing API access",
      "Analytics and search are restricted"
    ]
  },
  {
    name: "TikTok",
    posture: "Selective media layer",
    summary:
      "Useful for creator media and video proof, especially when the account explicitly authorizes Display API and posting.",
    capabilities: [
      "Login Kit OAuth",
      "Display API profile and video metadata",
      "Content Posting API after app review",
      "Embeddable recent/self-selected videos"
    ],
    constraints: [
      "No broad public feed access",
      "Posting and higher access require review",
      "Research API is specialized and approval-based"
    ]
  },
  {
    name: "X",
    posture: "Budget-gated optional channel",
    summary:
      "Current X API access is pay-per-use, so the architecture should enforce budgets before enabling reads or automation.",
    capabilities: [
      "Post publishing",
      "Owned reads at reduced cost",
      "Search and public conversation access",
      "Official TypeScript/Python SDK direction"
    ],
    constraints: [
      "No free read tier assumption",
      "Per-resource costs must be monitored",
      "Hard monthly spend limits are mandatory"
    ]
  }
] as const;

export const architecturePillars = [
  {
    title: "Portfolio Core",
    body:
      "Static, fast, and searchable professional content generated from typed data modules instead of scattered markup."
  },
  {
    title: "Atlas Interface",
    body:
      "A React island with streaming events today, ready to map into AG-UI event semantics as the backend matures."
  },
  {
    title: "Official API Layer",
    body:
      "Provider modules isolate OAuth, scopes, cost controls, and platform-specific capability boundaries."
  },
  {
    title: "Evidence Registry",
    body:
      "Projects, repos, roles, and academic context stay structured so the agent can cite verified material later."
  }
] as const;
