export type SocialProviderName = "linkedin" | "tiktok" | "x";

export type SocialProviderConfig = {
  name: SocialProviderName;
  label: string;
  requiredEnv: string[];
  scopes: string[];
  capabilities: string[];
  risk: "low" | "medium" | "high";
};

export type ProviderRuntimeStatus = SocialProviderConfig & {
  configured: boolean;
  missingEnv: string[];
};
