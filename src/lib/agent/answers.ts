const fallback =
  "Atlas is running in portfolio preview mode. The production version should answer with verified evidence from the profile, GitHub repositories, academic context, and authorized APIs.";

export function answerAtlasPrompt(input: string): string {
  const prompt = input.trim().toLowerCase();

  if (!prompt) {
    return fallback;
  }

  if (prompt.includes("linkedin") || prompt.includes("api")) {
    return "The first official API integration should be LinkedIn: it matches the professional purpose of the site, supports OAuth identity, and can publish personal content through the w_member_social scope. TikTok is useful for media proof after app review. X should be budget-gated because reads are pay-per-use.";
  }

  if (prompt.includes("deepmath") || prompt.includes("experience")) {
    return "Andre currently works in Software and AI Engineering at Deepmath, modernizing internal systems such as CRM and management software while integrating AI into sales and operational workflows. Earlier work at Deepmath included R&D for engineering assistants, CFD-adjacent workflows, and mesh optimization.";
  }

  if (prompt.includes("project") || prompt.includes("github") || prompt.includes("repos")) {
    return "The strongest project signals are Atlas Desktop Agent, RagSystem, CLI-Functions, EnglishTutor, EnterpriseSearch, and domain-specific assistants such as ARIS. Together they show a pattern: agent tooling, retrieval, automation, and applied AI products rather than isolated notebooks.";
  }

  if (prompt.includes("research") || prompt.includes("academic") || prompt.includes("ufrj")) {
    return "Andre's academic background at UFRJ connects applied mathematics, Earth sciences, remote sensing, and AI for atmospheric monitoring. That scientific base gives the portfolio a stronger technical narrative than a conventional software-only profile.";
  }

  if (prompt.includes("skill") || prompt.includes("stack")) {
    return "The core stack is Python, TypeScript, AI agents, LangChain/LangGraph, MCP, Power Platform, Power BI, PyTorch, TensorFlow, Scikit-learn, R, SQL, and Google Earth Engine. The site is now structured to present those skills as evidence-backed capabilities.";
  }

  return fallback;
}
