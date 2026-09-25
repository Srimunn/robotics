/**
 * Crawl every route as CEO, then check what the view-only CS role and a Labour can see.
 *
 * !!! Creates data (a tool, a labour). Run only against a local / throwaway database. See e2e/README.md.
 */
import {
  test,
  expect,
  loginAs,
  loginAsLabour,
  navTo,
  uid,
  gotoLogin,
  rolePin,
  fieldInput,
  type ErrorLog,
} from "./helpers";
import type { Page } from "@playwright/test";

/** Every file route in src/routes (tools.$machineId is resolved at runtime from the machines list). */
const ROUTES = [
  "/",
  "/enquiries",
  "/projects",
  "/customers",
  "/payments",
  "/labours",
  "/attendance",
  "/machines",
  "/materials",
  "/engineers",
  "/reports",
  "/settings",
  "/import",
] as const;

/**
 * Tab-like controls per page. Pages mix Radix tabs (role=tab) with button toggles, so the button
 * toggles are listed explicitly (labels read from the route components).
 */
const BUTTON_TABS: Record<string, string[]> = {
  "/": ["All Activity", "Shifts & Attendance", "Project Status", "Payments", "Equipment"],
  "/enquiries": ["Today's Visits", "Follow-up", "Approved", "Cancelled", "ALL"],
  "/projects": ["Scheduled", "Ongoing", "Completed", "Closed", "ALL"],
  "/payments": ["History", "Ledger", "Receivables"],
  "/labours": ["Attendance", "Labour Table", "Profile"],
  "/attendance": ["View Logs"],
  "/reports": [
    "Projects",
    "Pending",
    "Enquiries",
    "Attendance",
    "Payroll",
    "My Activity",
    "Ledger",
    "Revenue",
  ],
  "/settings": ["General Settings", "Master Data"],
};

async function assertHealthy(page: Page, errors: ErrorLog, where: string) {
  await expect(
    page.getByText("Application Error", { exact: true }),
    `${where}: error boundary shown`,
  ).toHaveCount(0);
  await expect(page.getByText(/Something went wrong/i), `${where}: error screen`).toHaveCount(0);
  const unexpected = errors.unexpected();
  expect(unexpected, `${where}: page/console/server errors`).toEqual([]);
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/** Click every tab (role=tab and known button toggles) inside <main>, checking health after each. */
async function clickTabs(page: Page, errors: ErrorLog, route: string) {
  const main = page.locator("main");
  const roleTabs = main.getByRole("tab");
  const n = await roleTabs.count();
  for (let i = 0; i < n; i++) {
    const tab = roleTabs.nth(i);
    if (!(await tab.isVisible()) || (await tab.isDisabled())) continue;
    const name = (await tab.innerText()).trim();
    await tab.click();
    await expect(tab).toHaveAttribute("data-state", "active");
    await settle(page);
    await assertHealthy(page, errors, `${route} tab "${name}"`);
  }
  for (const label of BUTTON_TABS[route] ?? []) {
    // Button labels may carry a trailing count (e.g. "Payments0"), so match on the start.
    const btn = main
      .getByRole("button", {
        name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d*$`),
      })
      .first();
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.click();
    await settle(page);
    await assertHealthy(page, errors, `${route} tab "${label}"`);
  }
}

function decodeServerFnName(url: string) {
  try {
    const id = url.split("/_serverFn/")[1].split("?")[0];
    return JSON.parse(Buffer.from(id, "base64").toString()).export ?? id;
  } catch {
    return url.slice(0, 120);
  }
}

async function ensureMachineId(page: Page): Promise<string> {
  await navTo(page, "/machines");
  const link = page.locator("main a[href^='/tools/']").first();
  if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return decodeURIComponent((await link.getAttribute("href"))!.replace("/tools/", ""));
  }
  // Empty inventory: add one tool so the detail route can be crawled.
  const name = `${uid()} Crawl Tool`;
  await page.getByRole("button", { name: "Add Tool", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await fieldInput(dialog, "Name *").fill(name);
  await fieldInput(dialog, "Stock *").fill("2");
  await dialog.getByRole("button", { name: "Save Machine" }).click();
  await expect(page.locator("main a[href^='/tools/']").first()).toBeVisible();
  return decodeURIComponent(
    (await page.locator("main a[href^='/tools/']").first().getAttribute("href"))!.replace(
      "/tools/",
      "",
    ),
  );
}

test.describe("crawl as CEO", () => {
  test("every route renders without errors and all tabs are clickable", async ({
    page,
    errors,
  }) => {
    test.setTimeout(10 * 60_000);
    await loginAs(page, "CEO");
    await assertHealthy(page, errors, "after login");

    for (const route of ROUTES) {
      await test.step(route, async () => {
        errors.clear();
        await navTo(page, route);
        await expect(page.locator("main")).toBeVisible();
        await settle(page);
        await assertHealthy(page, errors, route);
        await clickTabs(page, errors, route);
      });
    }

    await test.step("/tools/<machineId>", async () => {
      const machineId = await ensureMachineId(page);
      errors.clear();
      await navTo(page, `/tools/${encodeURIComponent(machineId)}`);
      await settle(page);
      await expect(page.locator("main")).toContainText(machineId);
      await expect(page.getByText(/Machine not found|Return to Tools List/i)).toHaveCount(0);
      await assertHealthy(page, errors, `/tools/${machineId}`);
      await clickTabs(page, errors, "/tools");
    });

    await test.step("unknown route shows a not-found screen, not a crash", async () => {
      errors.clear();
      await navTo(page, "/definitely-not-a-route");
      await expect(page.getByText("Application Error", { exact: true })).toHaveCount(0);
    });
  });
});

test.describe("login", () => {
  for (const role of ["CEO", "RS", "DRS", "CS", "BS"] as const) {
    test(`${role} can sign in with its PIN`, async ({ page, errors }) => {
      await loginAs(page, role);
      await expect(page.locator("main")).toBeVisible();
      expect(errors.unexpected()).toEqual([]);
    });
  }

  test("a wrong PIN is rejected", async ({ page }) => {
    await gotoLogin(page);
    await page.getByRole("button", { name: "Admin", exact: true }).click();
    await page.locator("#pin-input").fill(rolePin("CEO") === "0000" ? "1111" : "0000");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /Incorrect/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});

test.describe("view-only CS role", () => {
  /** Controls a view-only role must never be able to use. */
  const FORBIDDEN_TITLES = /^(Delete|Edit)\b/i;
  const FORBIDDEN_BUTTONS: Record<string, RegExp[]> = {
    "/projects": [/^Receive Payment$/],
    "/payments": [/^Receive Payment$/, /^\s*Receive$/],
    "/labours": [
      /^Add Labour$/,
      /^Mark Attendance$/,
      /^Reset PIN$/,
      /^Deactivate$/,
      /^Delete Permanently$/,
      /^Edit Profile$/,
    ],
    "/attendance": [/^Mark Attendance$/, /^Log Time$/],
    "/machines": [/^Add Tool$/, /^Add Machine \/ Tool$/, /^Issue$/],
    "/materials": [/^Add New Material$/, /^Add Material Stock$/, /^Issue$/],
    "/engineers": [/^Add Engineer$/],
    "/settings": [/^Add Value$/],
  };

  test("edit/delete controls are hidden or disabled on every page", async ({ page, errors }) => {
    test.setTimeout(5 * 60_000);
    await loginAs(page, "CS");
    const problems: string[] = [];
    for (const route of ROUTES) {
      await navTo(page, route);
      await settle(page);
      await assertHealthy(page, errors, `CS ${route}`);
      const main = page.locator("main");
      // Icon buttons carry their meaning in `title` (e.g. "Delete Project", "Edit Machine").
      const titled = main.locator("button[title]");
      for (let i = 0; i < (await titled.count()); i++) {
        const b = titled.nth(i);
        const title = (await b.getAttribute("title")) || "";
        if (FORBIDDEN_TITLES.test(title) && (await b.isVisible()) && (await b.isEnabled())) {
          problems.push(`${route}: enabled "${title}" button`);
        }
      }
      for (const re of FORBIDDEN_BUTTONS[route] ?? []) {
        const b = main.getByRole("button", { name: re });
        for (let i = 0; i < (await b.count()); i++) {
          if ((await b.nth(i).isVisible()) && (await b.nth(i).isEnabled())) {
            problems.push(`${route}: enabled "${(await b.nth(i).innerText()).trim()}" button`);
          }
        }
      }
    }
    expect(problems, "view-only role can reach mutating controls").toEqual([]);
  });

  test("CS cannot approve an enquiry (Approved option disabled)", async ({ page }) => {
    await loginAs(page, "CS");
    await navTo(page, "/enquiries");
    const trigger = page.locator("main tbody tr").first().getByRole("combobox");
    test.skip(!(await trigger.isVisible().catch(() => false)), "no enquiries to check");
    await trigger.click();
    await expect(page.getByRole("option", { name: "Approved" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.keyboard.press("Escape");
  });

  test("[bug] CS cannot see labour login PINs", async ({ page }) => {
    await loginAs(page, "CS");
    await navTo(page, "/labours");
    await settle(page);
    await expect(page.locator("main")).not.toContainText(/Generated 4-Digit PIN/i);
    await expect(
      page.locator("main").getByRole("button", { name: "Copy Credentials" }),
    ).toHaveCount(0);
  });
});

let cachedLabour: { name: string; pin: string } | undefined;
/** Labour credentials: E2E_LABOUR_NAME/E2E_LABOUR_PIN, or a throwaway labour created via the UI (seeded PINs are random). */
async function ensureLabour(page: Page) {
  if (process.env.E2E_LABOUR_NAME && process.env.E2E_LABOUR_PIN) {
    return { name: process.env.E2E_LABOUR_NAME, pin: process.env.E2E_LABOUR_PIN };
  }
  if (cachedLabour) return cachedLabour;
  const name = `${uid()} Crawl Labour`;
  const pin = "4321";
  await loginAs(page, "CEO");
  await navTo(page, "/labours");
  await page
    .locator("main")
    .getByRole("button", { name: "Add Labour", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await fieldInput(dialog, "Name *").fill(name);
  await fieldInput(dialog, "Phone *").fill("9000000001");
  await fieldInput(dialog, "PIN").fill(pin);
  await fieldInput(dialog, "Daily Wage (₹/day) *").fill("900");
  await dialog.getByRole("button", { name: "Add Labour Profile" }).click();
  await expect(dialog).toBeHidden();
  cachedLabour = { name, pin };
  return cachedLabour;
}

test.describe("Labour role", () => {
  test("labour sees only their own dashboard", async ({ page, errors }) => {
    test.setTimeout(3 * 60_000);
    const { name, pin } = await ensureLabour(page);
    errors.clear();
    await loginAsLabour(page, name, pin);
    await settle(page);
    await assertHealthy(page, errors, "labour dashboard");
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    // No staff navigation / financial cockpit.
    await expect(page.locator("[data-sidebar='sidebar']")).toHaveCount(0);
    await expect(page.getByText("CEO Financial Cockpit & Accounts Receivable")).toHaveCount(0);

    // Deep links to staff pages must not render staff data for a labour.
    for (const route of ["/payments", "/projects", "/labours", "/settings"]) {
      await navTo(page, route);
      await settle(page);
      await expect(
        page.getByRole("heading", { name: /^(Payments|Projects|Labours|Settings)$/ }),
        `labour at ${route}`,
      ).toHaveCount(0);
      await assertHealthy(page, errors, `labour at ${route}`);
    }
  });

  test("[bug] clock-in GPS is not reported as verified when location access is denied", async ({
    page,
    context,
  }) => {
    const { name, pin } = await ensureLabour(page);
    await context.clearPermissions(); // geolocation not granted
    await loginAsLabour(page, name, pin);
    await page.waitForTimeout(4_000); // the dashboard samples GPS for ~2s
    // With no real fix the app must not claim a verified, high-accuracy location.
    await expect(
      page.getByText(/Verified High Accuracy|High Accuracy Location (Captured|Verified)/i),
    ).toHaveCount(0);
    await expect(page.getByText(/HITEC City, Hyderabad/)).toHaveCount(0);
  });

  test("[bug] login page does not download labour PINs before authentication", async ({ page }) => {
    const leaked: string[] = [];
    page.on("response", async (res) => {
      if (!res.url().includes("/_serverFn/")) return;
      const body = await res.text().catch(() => "");
      // Server-fn payloads are seroval-encoded: object keys appear as a "k":[...] list.
      if (/"pin"/.test(body)) leaked.push(decodeServerFnName(res.url()));
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(leaked, "server functions returned labour PINs to an unauthenticated browser").toEqual(
      [],
    );
  });
});
