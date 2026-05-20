import type { ProviderRuntimeStatus, SocialProviderConfig } from "./types";

export const socialProviders: SocialProviderConfig[] = [
  {
    name: "linkedin",
    label: "LinkedIn",
    requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI"],
    scopes: ["openid", "profile", "email", "w_member_social"],
    capabilities: ["OAuth identity", "Share on LinkedIn", "Professional proof distribution"],
    risk: "low"
  },
  {
    name: "tiktok",
    label: "TikTok",
    requiredEnv: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"],
    scopes: ["user.info.basic", "video.list", "video.publish"],
    capabilities: ["Profile display", "Video metadata", "Content posting after review"],
    risk: "medium"
  },
  {
    name: "x",
    label: "X",
    requiredEnv: ["X_API_KEY", "X_API_SECRET", "X_BEARER_TOKEN", "X_MONTHLY_BUDGET_USD"],
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    capabilities: ["Publishing", "Owned reads", "Search with cost controls"],
    risk: "high"
  }
];

export function getProviderRuntimeStatus(env: Record<string, string | undefined>): ProviderRuntimeStatus[] {
  return socialProviders.map((provider) => {
    const missingEnv = provider.requiredEnv.filter((key) => !env[key]);

    return {
      ...provider,
      configured: missingEnv.length === 0,
      missingEnv
    };
  });
}
