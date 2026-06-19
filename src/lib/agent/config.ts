// Atlas backend connection config — server-side only.
//
// Read at request time from process.env (Astro Node standalone adapter), so the
// same build serves both topologies (docs/atlas-integration.md §2): point
// ATLAS_API_URL at a user-local loopback atlasd or an owner-hosted broker. When
// unset/disabled, the dock falls back to preview mode and a normal portfolio
// deploy never breaks.

export type AtlasConfig = {
  /** True only when explicitly enabled AND a base URL is present. */
  enabled: boolean;
  /** Normalized base URL (no trailing slash) or null when unset. */
  baseUrl: string | null;
  /** Upstream timeout before degrading to preview. */
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 30000;

function readBaseUrl(): string | null {
  const raw = (process.env.ATLAS_API_URL ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function readEnabled(baseUrl: string | null): boolean {
  const flag = (process.env.ATLAS_ENABLED ?? "").trim().toLowerCase();
  const on = flag === "true" || flag === "1" || flag === "yes";
  return on && baseUrl !== null;
}

function readTimeout(): number {
  const parsed = Number.parseInt(process.env.ATLAS_REQUEST_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function getAtlasConfig(): AtlasConfig {
  const baseUrl = readBaseUrl();
  return {
    baseUrl,
    enabled: readEnabled(baseUrl),
    timeoutMs: readTimeout()
  };
}
