/**
 * Production guard. Shared by global setup and every spec (via fixtures) so that
 * even `playwright test --global-setup=...` overrides cannot reach production.
 */
export const PROD_HOST_PATTERN = /railway\.app$/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function assertSafeTarget(rawUrl: string | undefined): URL {
  if (!rawUrl) throw new Error("[e2e guard] No base URL configured");
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`[e2e guard] Invalid base URL: ${rawUrl}`);
  }
  const host = url.hostname.toLowerCase();
  if (host.includes("railway.app") || PROD_HOST_PATTERN.test(host)) {
    throw new Error(
      `[e2e guard] Refusing to run against ${host}: *.railway.app hosts are production and are never allowed.`,
    );
  }
  if (!LOCAL_HOSTS.has(host) && process.env.E2E_ALLOW_REMOTE !== "1") {
    throw new Error(
      `[e2e guard] Refusing to run against non-local host "${host}". ` +
        `These tests create and delete data. Set E2E_ALLOW_REMOTE=1 only for a throwaway staging deployment.`,
    );
  }
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && /railway|rlwy\.net/i.test(dbUrl)) {
    throw new Error(
      "[e2e guard] DATABASE_URL in this environment points at Railway. Refusing to run.",
    );
  }
  return url;
}
