import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

/**
 * E2E suite for the Robotics ERP.
 *
 * !!! These tests CREATE, EDIT and DELETE data. Run them ONLY against a local or
 * throwaway/staging database. The global setup (e2e/global-setup.ts) refuses to run
 * against anything but localhost unless E2E_ALLOW_REMOTE=1, and never against *.railway.app.
 */
const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5175";

// Keep traces/reports OUTSIDE the repo: the Vite dev server watches the project root and
// full-reloads the app whenever Playwright writes trace .html resources there.
const artifactsDir = process.env.E2E_ARTIFACTS_DIR || path.join(os.tmpdir(), "robotics-e2e");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share one database and create interdependent records; keep them serial.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(artifactsDir, "report") }],
  ],
  outputDir: path.join(artifactsDir, "results"),
  use: {
    baseURL,
    trace: "retain-on-failure",
    // The app registers a PWA service worker; its fetches bypass page.route(), so block it.
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      // Never route localhost through the sandbox/corporate proxy.
      args: ["--no-proxy-server"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
