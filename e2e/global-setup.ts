import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { assertSafeTarget } from "./target-guard";

export default async function globalSetup(config: FullConfig) {
  const urls = new Set<string>();
  urls.add(process.env.E2E_BASE_URL || "http://127.0.0.1:5175");
  for (const p of config.projects) if (p.use?.baseURL) urls.add(p.use.baseURL);
  for (const u of urls) {
    const url = assertSafeTarget(u);
    console.log(`[e2e guard] target ${url.origin} OK`);
  }
  // One id per run, shared by all workers (a worker restarts after a failed test and would
  // otherwise lose module-level state). Specs persist cross-test fixtures in this state file.
  process.env.E2E_RUN_ID ||= `E2E-${Date.now().toString(36)}`;
  process.env.E2E_STATE_FILE ||= path.join(
    os.tmpdir(),
    "robotics-e2e",
    `state-${process.env.E2E_RUN_ID}.json`,
  );
  fs.mkdirSync(path.dirname(process.env.E2E_STATE_FILE), { recursive: true });

  // Make sure localhost never goes through a proxy for Node-side requests.
  const np = new Set((process.env.NO_PROXY || "").split(",").filter(Boolean));
  ["127.0.0.1", "localhost"].forEach((h) => np.add(h));
  process.env.NO_PROXY = process.env.no_proxy = [...np].join(",");
}
