import fs from "node:fs";
import {
  test as base,
  expect,
  type Page,
  type Locator,
  type ConsoleMessage,
} from "@playwright/test";
import { assertSafeTarget } from "./target-guard";

export type StaffRole = "CEO" | "RS" | "DRS" | "CS" | "BS";

/** Login-page button label for each staff role (src/components/LoginPage.tsx). */
const ROLE_BUTTON: Record<StaffRole, string> = {
  CEO: "Admin",
  RS: "RS",
  DRS: "DRS",
  CS: "CS",
  BS: "BS",
};
const DEFAULT_PINS: Record<StaffRole, string> = {
  CEO: "1234",
  RS: "5678",
  DRS: "9753",
  CS: "2468",
  BS: "8642",
};

export function rolePin(role: StaffRole): string {
  return process.env[`E2E_${role}_PIN`] || DEFAULT_PINS[role];
}

/** Run-wide prefix ("E2E-<base36 time>") set by global setup. */
export const RUN_ID = process.env.E2E_RUN_ID || `E2E-${Date.now().toString(36)}`;

/** Tiny JSON store that survives worker restarts within one `playwright test` run. */
export async function cached<T>(key: string, create: () => Promise<T>): Promise<T> {
  const file = process.env.E2E_STATE_FILE;
  const read = (): Record<string, unknown> => {
    try {
      return file ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    } catch {
      return {};
    }
  };
  const hit = read()[key];
  if (hit !== undefined) return hit as T;
  const value = await create();
  if (file) fs.writeFileSync(file, JSON.stringify({ ...read(), [key]: value }, null, 2));
  return value;
}

export const uid = () => `E2E-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Parse "₹1,23,456" / "1,234.50" into a number. */
export function money(text: string | null | undefined): number {
  const m = (text || "").replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

export interface ErrorLog {
  pageErrors: string[];
  consoleErrors: string[];
  serverErrors: string[];
  /** Messages that match one of these patterns are recorded but not counted as failures. */
  allow: RegExp[];
  clear(): void;
  unexpected(): string[];
}

const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /favicon/i,
  // Chromium noise for blocked third-party resources in an offline sandbox
  /net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|PROXY|TUNNEL|CONNECTION_REFUSED|BLOCKED)/i,
  /Failed to load resource: net::/i,
  // In-flight data queries aborted by a test navigating away (page.goto) — not an app error.
  // Real server failures are still caught through the 5xx response check.
  /Error fetching\/mapping \w+: TypeError: Failed to fetch/i,
];

export function attachErrorLog(page: Page, origin?: string): ErrorLog {
  const log: ErrorLog = {
    pageErrors: [],
    consoleErrors: [],
    serverErrors: [],
    allow: [],
    clear() {
      this.pageErrors.length = 0;
      this.consoleErrors.length = 0;
      this.serverErrors.length = 0;
    },
    unexpected() {
      const all = [
        ...this.pageErrors.map((e) => `pageerror: ${e}`),
        ...this.consoleErrors.map((e) => `console.error: ${e}`),
        ...this.serverErrors.map((e) => `server: ${e}`),
      ];
      return all.filter((m) => !this.allow.some((re) => re.test(m)));
    },
  };
  page.on("pageerror", (err) => log.pageErrors.push(`${err.message}`.slice(0, 500)));
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    log.consoleErrors.push(`${text}`.slice(0, 500) + ` @ ${page.url()}`);
  });
  page.on("response", async (res) => {
    if (res.status() < 500) return;
    const url = res.url();
    if (origin && new URL(url).origin !== origin) return; // third-party, not our server
    let body = "";
    try {
      body = (await res.text()).slice(0, 300);
    } catch {
      /* body not readable */
    }
    log.serverErrors.push(
      `${res.status()} ${res.request().method()} ${url.replace(/^https?:\/\/[^/]+/, "")} ${body}`,
    );
  });
  return log;
}

export const test = base.extend<{ errors: ErrorLog }>({
  page: async ({ page, baseURL }, provide) => {
    assertSafeTarget(baseURL);
    // Guard at the network layer as well: abort any request that is not to the target origin
    // and that is aimed at a production host.
    await page.route(/railway\.app/i, (route) => route.abort("blockedbyclient"));
    // Keep the run hermetic: third-party requests (Google Fonts, CDNs) are blocked.
    const origin = new URL(baseURL!).origin;
    await page.route(
      (url) => url.origin !== origin,
      (route) => route.abort("blockedbyclient"),
    );
    await provide(page);
  },
  errors: async ({ page, baseURL }, provide) => {
    const log = attachErrorLog(page, baseURL ? new URL(baseURL).origin : undefined);
    await provide(log);
  },
});
export { expect };

/** Wait for the SPA shell to finish its initial data load. */
export async function waitForApp(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body"))
    .not.toContainText("Loading", { timeout: 30_000 })
    .catch(() => {});
}

/** page.goto that tolerates the dev server's one-off dependency re-optimisation reload. */
export async function safeGoto(page: Page, path: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      return;
    } catch (e) {
      if (attempt >= 2 || !/ERR_ABORTED|interrupted/i.test(String(e))) throw e;
      await page.waitForTimeout(1500);
    }
  }
}

export async function gotoLogin(page: Page) {
  await safeGoto(page, "/");
  // Drop any stored session (the app keeps the logged-in user in localStorage only).
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* storage may be unavailable */
    }
  });
  await safeGoto(page, "/");
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible({ timeout: 45_000 });
  await waitForHydration(page);
}

/**
 * The login page is server-rendered; clicking "Sign In" before React hydrates performs a native
 * form GET and silently reloads the page. Wait until the initial data queries have settled.
 */
export async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForFunction(
    () => {
      const btn = document.querySelector("button[type=submit], main, [data-sidebar]");
      return (
        !!btn &&
        Object.keys(btn).some((k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps"))
      );
    },
    undefined,
    { timeout: 30_000 },
  );
}

export async function loginAs(page: Page, role: StaffRole) {
  await gotoLogin(page);
  await page.getByRole("button", { name: ROLE_BUTTON[role], exact: true }).click();
  await page.locator("#pin-input").fill(rolePin(role));
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeHidden({ timeout: 30_000 });
  await expect(page.locator("[data-sidebar='sidebar'], aside, nav").first()).toBeVisible();
}

export async function loginAsLabour(page: Page, labourName: string, pin: string) {
  await gotoLogin(page);
  await page.getByRole("button", { name: "Labour", exact: true }).click();
  const combo = page.getByRole("combobox");
  await expect(combo).toBeVisible();
  await combo.click();
  await page.getByRole("option", { name: labourName, exact: true }).click();
  await page.locator("#pin-input").fill(pin);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeHidden({ timeout: 30_000 });
}

/**
 * The app's <Label>s are not associated with their inputs (no htmlFor), so getByLabel does not
 * work. This finds the smallest container holding a <label> with the given exact text and returns it.
 */
export function field(scope: Page | Locator, labelText: string | RegExp): Locator {
  const re =
    typeof labelText === "string" ? new RegExp(`^\\s*${escapeRe(labelText)}\\s*$`) : labelText;
  return scope.locator("label").filter({ hasText: re }).first().locator("xpath=..");
}
export function fieldInput(scope: Page | Locator, labelText: string | RegExp): Locator {
  return field(scope, labelText).locator("input:not([type=hidden]), textarea").first();
}
export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pick a value from a Radix <Select> whose trigger is inside `container`. */
export async function selectOption(page: Page, trigger: Locator, option: string | RegExp) {
  await trigger.click();
  const opt = page.getByRole("option", { name: option }).first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
}

/** Latest sonner toast text. */
export function toasts(page: Page): Locator {
  return page.locator("[data-sonner-toast]");
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(toasts(page).filter({ hasText: text }).first()).toBeVisible({ timeout: 20_000 });
}

export async function navTo(page: Page, path: string) {
  // Client-side navigation keeps the logged-in session (stored in localStorage) and the query cache.
  await safeGoto(page, path);
  await expect(page.getByRole("button", { name: "Sign In" })).toBeHidden({ timeout: 30_000 });
}
