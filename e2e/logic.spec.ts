/**
 * Business-logic checks driven through the UI.
 *
 * !!! These tests create enquiries, projects, payments, tools, materials, labours and attendance,
 * and delete some of them. Run ONLY against a local / throwaway database (see e2e/README.md).
 *
 * Tests tagged "[bug]" assert the CORRECT behaviour for a known (or newly found) defect, so they
 * are expected to fail until the defect is fixed.
 */
import type { Locator, Page } from "@playwright/test";
import {
  test,
  expect,
  loginAs,
  navTo,
  RUN_ID,
  cached,
  money,
  fieldInput,
  expectToast,
  escapeRe,
} from "./helpers";

// ---------------------------------------------------------------------------
// UI helpers (labels taken from src/routes/*.tsx)
// ---------------------------------------------------------------------------

const RUN = RUN_ID;
const mainEl = (page: Page) => page.locator("main");

async function search(page: Page, text: string, placeholder: string | RegExp = "Search...") {
  const box = mainEl(page).getByPlaceholder(placeholder).first();
  await box.fill("");
  await box.fill(text);
}

function rowWith(page: Page, text: string): Locator {
  return mainEl(page).locator("tbody tr").filter({ hasText: text });
}

interface ProjectRef {
  customer: string;
  enquiryId: string;
  projectId: string;
  value: number;
}

async function createEnquiry(page: Page, customer: string, amount: number): Promise<string> {
  await navTo(page, "/enquiries");
  await mainEl(page).getByRole("button", { name: "New Enquiry" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("New Enquiry");
  await fieldInput(dialog, "Name *").fill(customer);
  await fieldInput(dialog, "Phone 1 *").fill(`9${String(Date.now()).slice(-9)}`);
  await fieldInput(dialog, "Location").fill("Erode");
  await fieldInput(dialog, "Amount (₹)").fill(String(amount));
  await dialog.getByRole("button", { name: "Save Enquiry" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await search(page, customer);
  const row = rowWith(page, customer);
  await expect(row).toHaveCount(1);
  const id = (await row.locator("td").first().innerText()).match(/ENQ-[\w-]+/)?.[0];
  expect(id, "enquiry id shown in first column").toBeTruthy();
  return id!;
}

async function approveEnquiry(page: Page, customer: string) {
  await search(page, customer);
  const row = rowWith(page, customer);
  await row.getByRole("combobox").click();
  await page.getByRole("option", { name: "Approved", exact: true }).click();
  await expect(row.getByRole("button", { name: /Convert to Project/i })).toBeVisible();
}

async function findProjectId(page: Page, customer: string): Promise<string[]> {
  await navTo(page, "/projects");
  await search(page, customer);
  await page.waitForTimeout(500);
  const rows = rowWith(page, customer);
  const ids: string[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const m = (await rows.nth(i).innerText()).match(/PRJ-[\w-]+/);
    if (m) ids.push(m[0]);
  }
  return ids;
}

async function createProject(page: Page, label: string, value: number): Promise<ProjectRef> {
  const customer = `${RUN} ${label}`;
  const enquiryId = await createEnquiry(page, customer, value);
  await approveEnquiry(page, customer);
  await rowWith(page, customer)
    .getByRole("button", { name: /Convert to Project/i })
    .click();
  await page.waitForURL(/\/projects/, { timeout: 30_000 });
  await expect
    .poll(async () => (await findProjectId(page, customer)).length, { timeout: 30_000 })
    .toBe(1);
  const [projectId] = await findProjectId(page, customer);
  return { customer, enquiryId, projectId, value };
}

async function openProject(page: Page, projectId: string): Promise<Locator> {
  await navTo(page, `/projects?openId=${encodeURIComponent(projectId)}`);
  const dialog = page.getByRole("dialog").filter({ hasText: projectId }).first();
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

/** Financial KPI card value in the project cockpit ("Contract Value", "Net Payable", ...). */
async function kpi(dialog: Locator, label: string): Promise<number> {
  const labelEl = dialog
    .locator("p")
    .filter({ hasText: new RegExp(`^\\s*${escapeRe(label)}\\s*$`) })
    .first();
  const value =
    label === "Discount"
      ? labelEl.locator("xpath=../following-sibling::p[1]")
      : labelEl.locator("xpath=following-sibling::p[1]");
  const txt = await value.innerText();
  return txt.trim() === "₹0" ? 0 : Math.abs(money(txt));
}

interface Receivable {
  value: number;
  received: number;
  balance: number;
  status: string;
}

/** Row of the Payments > Receivables table for a project. */
async function receivable(page: Page, projectId: string): Promise<Receivable> {
  await navTo(page, "/payments");
  await mainEl(page).getByRole("button", { name: "Receivables", exact: true }).click();
  await search(page, projectId);
  const row = rowWith(page, projectId);
  await expect(row).toHaveCount(1);
  const cells = row.locator("td");
  return {
    value: money(await cells.nth(3).innerText()),
    received: money(await cells.nth(4).innerText()),
    balance: money(await cells.nth(5).innerText()),
    status: (await cells.nth(8).innerText()).trim(),
  };
}

async function receivePaymentInProject(page: Page, projectId: string, amount: number) {
  const dialog = await openProject(page, projectId);
  await dialog.getByRole("button", { name: "Receive Payment" }).click();
  const pay = page.getByRole("dialog").filter({ hasText: "Receive Payment Cockpit" });
  await expect(pay).toBeVisible();
  await fieldInput(pay, "Amount Received (₹) *").fill(String(amount));
  await pay.getByRole("button", { name: "Save Collection Receipt" }).click();
  await expect(pay).toBeHidden({ timeout: 20_000 });
}

async function paymentsForProject(page: Page, projectId: string): Promise<number> {
  await navTo(page, "/payments");
  await mainEl(page).getByRole("button", { name: "History", exact: true }).click();
  await search(page, projectId);
  await page.waitForTimeout(500);
  return rowWith(page, projectId).count();
}

// ---------------------------------------------------------------------------
// Fixtures. Each money test gets its own project; stock/attendance tests share one "Ops" project
// (persisted in the run state file, so it survives worker restarts after a failing test).
// ---------------------------------------------------------------------------

const opsProject = (page: Page) =>
  cached(`${RUN}:ops-project`, () => createProject(page, "Ops Customer", 75_000));

test.beforeEach(async ({ page, errors }) => {
  // Validation errors surfaced by the app through toasts are asserted explicitly where expected.
  errors.allow.push(/Insufficient|cannot exceed|Cannot delete|Cannot return/i);
  await loginAs(page, "CEO");
});

test.afterEach(async ({ errors }, testInfo) => {
  const unexpected = errors.unexpected();
  if (unexpected.length) {
    testInfo.annotations.push({ type: "unexpected-errors", description: unexpected.join("\n") });
    console.log(`[${testInfo.title}] unexpected errors:\n  ${unexpected.join("\n  ")}`);
  }
});

async function addDiscount(page: Page, projectId: string, amount: number) {
  const dialog = await openProject(page, projectId);
  await dialog
    .locator("p", { hasText: /^Discount$/ })
    .locator("xpath=..")
    .getByRole("button")
    .click();
  const disc = page.getByRole("dialog").filter({ hasText: /Project Discount/ });
  await fieldInput(disc, "Discount Amount (₹) *").fill(String(amount));
  await fieldInput(disc, "Discount Authorized By").fill("E2E");
  await disc.getByRole("button", { name: "Save Discount" }).click();
  await expectToast(page, /Discount applied/i);
  await expect(disc).toBeHidden();
}

// ---------------------------------------------------------------------------
// Enquiry -> Project
// ---------------------------------------------------------------------------

test("enquiry -> approve -> convert: project value equals quotation; cannot convert twice", async ({
  page,
}) => {
  const P = await createProject(page, "Convert Customer", 100_000);
  const dialog = await openProject(page, P.projectId);
  expect(await kpi(dialog, "Contract Value")).toBe(100_000);
  expect(await kpi(dialog, "Outstanding Balance")).toBe(100_000);
  expect(await kpi(dialog, "Collected Amount")).toBe(0);
  expect(await receivable(page, P.projectId)).toMatchObject({
    value: 100_000,
    received: 0,
    balance: 100_000,
    status: "Pending",
  });

  // Converted enquiry: the row offers "View Project", not "Convert".
  await navTo(page, "/enquiries");
  await search(page, P.customer);
  const row = rowWith(page, P.customer);
  await expect(row.getByRole("button", { name: /View Project/ })).toBeVisible();
  await expect(row.getByRole("button", { name: /Convert to Project/i })).toHaveCount(0);

  // The enquiry cockpit still renders "Convert To Project" in its Approved banner;
  // pressing it must not create a second project.
  await row.locator("td").first().click();
  const enq = page.getByRole("dialog").filter({ hasText: P.enquiryId });
  await expect(enq).toBeVisible();
  const again = enq.getByRole("button", { name: /Convert To Project/i });
  if (
    await again
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await again.first().click();
    await page.waitForTimeout(1500);
  }
  expect(await findProjectId(page, P.customer)).toEqual([P.projectId]);
});

test("[bug] double-clicking Convert creates exactly one project and no error", async ({
  page,
  errors,
}) => {
  const customer = `${RUN} DoubleConvert`;
  await createEnquiry(page, customer, 12_345);
  await approveEnquiry(page, customer);
  errors.clear();
  await rowWith(page, customer)
    .getByRole("button", { name: /Convert to Project/i })
    .dblclick();
  await page.waitForURL(/\/projects/, { timeout: 30_000 });
  await page.waitForTimeout(2000);
  expect((await findProjectId(page, customer)).length).toBe(1);
  expect(errors.unexpected(), "concurrent conversion surfaced an unhandled error").toEqual([]);
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

test("payments: received/balance update, overpayment rejected, Partial -> Paid", async ({
  page,
}) => {
  const P = await createProject(page, "Payment Customer", 50_000);

  await receivePaymentInProject(page, P.projectId, 20_000);
  await expect
    .poll(async () => receivable(page, P.projectId), { timeout: 30_000 })
    .toMatchObject({ value: 50_000, received: 20_000, balance: 30_000, status: "Partial" });

  // Overpayment via the Payments page is rejected.
  await navTo(page, "/payments");
  await search(page, P.projectId);
  await rowWith(page, P.projectId)
    .getByRole("button", { name: /Receive/ })
    .click();
  const pay = page.getByRole("dialog").filter({ hasText: "Receive Stage Payment" });
  await fieldInput(pay, "Amount Received (₹) *").fill("30001");
  await pay.getByRole("button", { name: "Record Payment" }).click();
  await expectToast(page, /cannot exceed/i);
  await pay.getByRole("button", { name: "Cancel" }).click();

  // ...and via the project cockpit.
  const dialog = await openProject(page, P.projectId);
  await dialog.getByRole("button", { name: "Receive Payment" }).click();
  const pay2 = page.getByRole("dialog").filter({ hasText: "Receive Payment Cockpit" });
  await fieldInput(pay2, "Amount Received (₹) *").fill("30001");
  await pay2.getByRole("button", { name: "Save Collection Receipt" }).click();
  await expectToast(page, /cannot exceed/i);
  await pay2.getByRole("button", { name: "Cancel" }).click();
  expect(await receivable(page, P.projectId)).toMatchObject({ received: 20_000, balance: 30_000 });

  // Paying the exact balance settles the project.
  await receivePaymentInProject(page, P.projectId, 30_000);
  await expect
    .poll(async () => receivable(page, P.projectId), { timeout: 30_000 })
    .toMatchObject({ received: 50_000, balance: 0, status: "Paid" });
  await expect(rowWith(page, P.projectId).getByRole("button", { name: /Receive/ })).toHaveCount(0);
});

test("discount: balance = value - discount - received", async ({ page }) => {
  const P = await createProject(page, "Discount Customer", 100_000);
  await receivePaymentInProject(page, P.projectId, 30_000);
  await addDiscount(page, P.projectId, 10_000);
  const d = await openProject(page, P.projectId);
  await expect.poll(() => kpi(d, "Outstanding Balance")).toBe(60_000);
  expect(await kpi(d, "Collected Amount")).toBe(30_000);
  expect(await receivable(page, P.projectId)).toMatchObject({
    received: 30_000,
    balance: 60_000,
    status: "Partial",
  });

  // Overpayment limit follows the discounted balance.
  const d2 = await openProject(page, P.projectId);
  await d2.getByRole("button", { name: "Receive Payment" }).click();
  const pay = page.getByRole("dialog").filter({ hasText: "Receive Payment Cockpit" });
  await fieldInput(pay, "Amount Received (₹) *").fill("60001");
  await pay.getByRole("button", { name: "Save Collection Receipt" }).click();
  await expectToast(page, /cannot exceed/i);
});

test("[bug] discount is still shown after reload (Discount and Net Payable KPIs)", async ({
  page,
}) => {
  const P = await createProject(page, "Discount Display", 100_000);
  await addDiscount(page, P.projectId, 10_000);
  await page.reload();
  const d = await openProject(page, P.projectId);
  expect(await kpi(d, "Outstanding Balance")).toBe(90_000);
  expect(await kpi(d, "Discount"), "Discount KPI").toBe(10_000);
  expect(await kpi(d, "Net Payable"), "Net Payable KPI").toBe(90_000);
});

test("[bug] editing only the enquiry remarks does not change the discounted project balance", async ({
  page,
}) => {
  const P = await createProject(page, "Remarks Customer", 100_000);
  await receivePaymentInProject(page, P.projectId, 30_000);
  await addDiscount(page, P.projectId, 10_000);
  await expect.poll(async () => (await receivable(page, P.projectId)).balance).toBe(60_000);

  await navTo(page, "/enquiries");
  await search(page, P.customer);
  await rowWith(page, P.customer).locator("td").first().click();
  const dialog = page.getByRole("dialog").filter({ hasText: P.enquiryId });
  await expect(dialog).toBeVisible();
  await fieldInput(dialog, "Remarks & Special Notes").fill(`remarks edited by ${RUN}`);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expectToast(page, /saved successfully/i);
  await page.waitForTimeout(1000);

  const r = await receivable(page, P.projectId);
  expect(r.balance, "balance must stay value - discount - received").toBe(60_000);
  const d = await openProject(page, P.projectId);
  expect(await kpi(d, "Outstanding Balance")).toBe(60_000);
});

// ---------------------------------------------------------------------------
// Machines / tools
// ---------------------------------------------------------------------------

const TOOL = `${RUN} Tool`;

async function machineCounts(page: Page, name: string) {
  await navTo(page, "/machines");
  await search(page, name);
  const row = rowWith(page, name);
  await expect(row).toHaveCount(1);
  const stockCell = await row.locator("td").nth(4).innerText(); // "3 / 5 Nos"
  const [available, total] = (stockCell.match(/\d+/g) || []).map(Number);
  const statusCell = await row.locator("td").nth(5).innerText();
  const issued = Number(statusCell.match(/Issued:\s*(\d+)/)?.[1] ?? 0);
  return { available, total, issued };
}

async function addTool(page: Page, name: string, stock: number) {
  await navTo(page, "/machines");
  await mainEl(page).getByRole("button", { name: "Add Tool", exact: true }).click();
  const add = page.getByRole("dialog");
  await fieldInput(add, "Name *").fill(name);
  await fieldInput(add, "Stock *").fill(String(stock));
  await add.getByRole("button", { name: "Save Machine" }).click();
  await expect(add).toBeHidden();
  await expect
    .poll(() => machineCounts(page, name))
    .toEqual({ available: stock, total: stock, issued: 0 });
}

test("machine: issue to project, block invalid quantities, partial then full return restores counts", async ({
  page,
}) => {
  const P = await opsProject(page);
  await addTool(page, TOOL, 5);

  // Issue 2 to the project.
  await rowWith(page, TOOL).getByRole("button", { name: "Issue", exact: true }).click();
  const issue = page.getByRole("dialog").filter({ hasText: TOOL });
  await issue.getByRole("combobox").click();
  await page.getByPlaceholder(/Type to search project/).fill(P.projectId);
  await page
    .getByRole("option", { name: new RegExp(escapeRe(P.projectId)) })
    .first()
    .click();
  await expect(issue.getByRole("combobox")).toContainText(P.projectId);
  await fieldInput(issue, "Quantity to Issue *").fill("2");
  await fieldInput(issue, "Issued By").fill("E2E");
  await issue.getByRole("button", { name: "Issue Machine" }).click();
  await expect(issue).toBeHidden();
  await expect.poll(() => machineCounts(page, TOOL)).toEqual({ available: 3, total: 5, issued: 2 });

  // Zero / negative quantities: the input must not hold a value < 1.
  for (const bad of ["0", "-3"]) {
    await rowWith(page, TOOL).getByRole("button", { name: "Issue", exact: true }).click();
    const dlg = page.getByRole("dialog").filter({ hasText: TOOL });
    const qty = fieldInput(dlg, "Quantity to Issue *");
    await qty.fill(bad);
    expect(Number(await qty.inputValue()), `quantity input accepted ${bad}`).toBeGreaterThanOrEqual(
      1,
    );
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await expect(dlg).toBeHidden();
  }
  expect(await machineCounts(page, TOOL)).toEqual({ available: 3, total: 5, issued: 2 });

  const returnQty = async (qty: number) => {
    const d = await openProject(page, P.projectId);
    const issueRow = d.locator("tr").filter({ hasText: TOOL });
    await issueRow.getByRole("button", { name: /Return Machine/ }).click();
    const ret = page.getByRole("dialog").filter({ hasText: "Return Machine to Inventory" });
    await fieldInput(ret, "Returned Quantity *").fill(String(qty));
    await ret.getByRole("button", { name: /Confirm Return/ }).click();
    await expect(ret).toBeHidden();
  };
  await returnQty(1); // partial
  await expect.poll(() => machineCounts(page, TOOL)).toEqual({ available: 4, total: 5, issued: 1 });
  await returnQty(1); // rest
  await expect.poll(() => machineCounts(page, TOOL)).toEqual({ available: 5, total: 5, issued: 0 });
  await expect(rowWith(page, TOOL)).toContainText("100% In Stock");
});

test("[bug] machine: editing a tool's name is saved", async ({ page, errors }) => {
  const name = `${RUN} Edit Tool`;
  const renamed = `${RUN} Edited Tool`;
  await addTool(page, name, 2);
  await rowWith(page, name).first().locator("button[title='Edit Machine']").click();
  const dlg = page.getByRole("dialog").filter({ hasText: /Edit Tool/ });
  await fieldInput(dlg, "Name *").fill(renamed);
  await dlg.getByRole("button", { name: "Update Machine" }).click();
  await expect(dlg).toBeHidden();
  await page.waitForTimeout(1500);
  await page.reload();
  await expect
    .poll(async () => {
      await navTo(page, "/machines");
      await search(page, renamed);
      return rowWith(page, renamed).count();
    })
    .toBe(1);
  expect(errors.serverErrors, "updateMachine server errors").toEqual([]);
});

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

const MAT = `${RUN} Material`;

test("material: issuing more than the stock is rejected", async ({ page }) => {
  const P = await opsProject(page);
  await navTo(page, "/materials");
  await mainEl(page)
    .getByRole("button", { name: /Add New Material/ })
    .click();
  const add = page.getByRole("dialog");
  await fieldInput(add, "Material Name *").fill(MAT);
  await fieldInput(add, "Current Stock *").fill("10");
  await fieldInput(add, "Minimum Stock Alert *").fill("1");
  await fieldInput(add, "Purchase Cost (₹) per Unit *").fill("100");
  await add.getByRole("button", { name: "Save Material" }).click();
  await expect(add).toBeHidden();

  const stock = async () => {
    await navTo(page, "/materials");
    await search(page, MAT, /Search Material Name/);
    return money(await rowWith(page, MAT).locator("td").nth(3).innerText());
  };
  await expect.poll(stock).toBe(10);

  await rowWith(page, MAT).getByRole("button", { name: "Issue", exact: true }).click();
  const dlg = page.getByRole("dialog").filter({ hasText: "Issue Material to Project" });
  await dlg.getByRole("combobox").click();
  await page
    .getByRole("option", { name: new RegExp(escapeRe(P.projectId)) })
    .first()
    .click();
  const qty = fieldInput(dlg, "Quantity Consumed *");
  await qty.fill("15");
  await fieldInput(dlg, "Issued By").fill("E2E");
  const accepted = Number(await qty.inputValue());
  await dlg.getByRole("button", { name: "Confirm Material Issue" }).click();
  await page.waitForTimeout(1500);
  const after = await stock();
  expect(accepted, "quantity input must not accept more than stock").toBeLessThanOrEqual(10);
  expect(after, "stock must never go negative").toBeGreaterThanOrEqual(0);
});

// ---------------------------------------------------------------------------
// Attendance / payroll
// ---------------------------------------------------------------------------

const LABOUR = `${RUN} Payroll Labour`;
const DAILY = 1000;

async function markAttendance(page: Page, projectId: string, date: string): Promise<number> {
  await navTo(page, "/attendance");
  await mainEl(page).getByRole("button", { name: "Mark Attendance" }).first().click();
  const dlg = page.getByRole("dialog").filter({ hasText: "Mark Labour Attendance" });
  const combos = dlg.getByRole("combobox");
  await combos.nth(0).click();
  await page.getByRole("option", { name: new RegExp(`^${escapeRe(LABOUR)}`) }).click();
  await combos.nth(1).click();
  await page
    .getByRole("option", { name: new RegExp(escapeRe(projectId)) })
    .first()
    .click();
  await fieldInput(dlg, "Attendance Date").fill(date);
  await fieldInput(dlg, "Start Time / In Time").fill("09:00 AM");
  await fieldInput(dlg, "End Time / Out Time").fill("06:00 PM");
  const earned = money(
    await dlg.getByText("Earned Wages:").locator("xpath=following-sibling::p[1]").innerText(),
  );
  await dlg.getByRole("button", { name: "Save & Mark Attendance" }).click();
  await expect(dlg).toBeHidden();
  return earned;
}

async function payrollRow(page: Page) {
  await navTo(page, "/attendance");
  await search(page, LABOUR);
  const row = rowWith(page, LABOUR);
  await expect(row).toHaveCount(1);
  const c = row.locator("td");
  return {
    present: money(await c.nth(3).innerText()),
    daily: money(await c.nth(5).innerText()),
    weekly: money(await c.nth(6).innerText()),
    monthly: money(await c.nth(7).innerText()),
  };
}

/** A labour (daily wage ₹1000) with two full days logged on the 1st and 2nd of this month. */
const payrollFixture = (page: Page) =>
  cached(`${RUN}:payroll`, async () => {
    const P = await opsProject(page);
    await navTo(page, "/labours");
    await mainEl(page).getByRole("button", { name: "Add Labour", exact: true }).first().click();
    const dlg = page.getByRole("dialog");
    await fieldInput(dlg, "Name *").fill(LABOUR);
    await fieldInput(dlg, "Phone *").fill("9000000002");
    await fieldInput(dlg, "PIN").fill("2580");
    await fieldInput(dlg, "Daily Wage (₹/day) *").fill(String(DAILY));
    await dlg.getByRole("button", { name: "Add Labour Profile" }).click();
    await expect(dlg).toBeHidden();

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const perDayEarned: number[] = [];
    for (const day of ["01", "02"])
      perDayEarned.push(await markAttendance(page, P.projectId, `${ym}-${day}`));
    await expect.poll(async () => (await payrollRow(page)).present).toBe(2);
    return { perDayEarned };
  });

/** "Earned Wages" of the labour's logged days as stored (Labours > profile > Recent Site Check-In & Work Logs). */
async function profileLogs(page: Page): Promise<{ date: string; earned: number }[]> {
  await navTo(page, "/labours");
  await search(page, LABOUR, /Search Labour Name/);
  await mainEl(page).getByText(LABOUR, { exact: true }).first().click();
  const table = mainEl(page)
    .locator("table")
    .filter({ has: page.locator("th", { hasText: /^Earned Wages$/ }) })
    .first();
  await expect(table.locator("tbody tr").first()).toContainText(/\d{4}-\d{2}-\d{2}/);
  const rows = table.locator("tbody tr");
  const out: { date: string; earned: number }[] = [];
  for (let i = 0; i < (await rows.count()); i++) {
    const cells = rows.nth(i).locator("td");
    out.push({
      date: (await cells.nth(0).innerText()).trim(),
      earned: money(await cells.nth(4).innerText()),
    });
  }
  return out;
}

/** Stored earnings per logged day (one value per distinct date). */
async function storedDailyEarnings(page: Page): Promise<number[]> {
  const byDate = new Map<string, number>();
  for (const l of await profileLogs(page)) byDate.set(l.date, l.earned);
  return [...byDate.keys()].sort().map((d) => byDate.get(d)!);
}

test("[bug] payroll: monthly wage is not ~4.33x the month's daily earnings", async ({ page }) => {
  await payrollFixture(page);
  const daily = await storedDailyEarnings(page);
  expect(daily.length, "two logged days").toBe(2);
  const sum = daily.reduce((a, b) => a + b, 0);
  const row = await payrollRow(page);
  expect(
    Math.abs(row.monthly - sum * 4.33),
    `monthly ${row.monthly} is ~4.33 x ${sum}`,
  ).toBeGreaterThan(sum * 0.5);
  expect(
    Math.abs(row.monthly - sum),
    `monthly ${row.monthly} vs this month's earnings ${sum}`,
  ).toBeLessThanOrEqual(1);
});

test("[bug] attendance: a day's earnings equal the labour's daily wage, not the weekly wage", async ({
  page,
}) => {
  const { perDayEarned } = await payrollFixture(page);
  const row = await payrollRow(page);
  expect.soft(row.daily, "DAILY WAGE column").toBe(DAILY);
  expect
    .soft(await storedDailyEarnings(page), "stored Earned Wages per full day (Labours profile)")
    .toEqual([DAILY, DAILY]);
  expect
    .soft(perDayEarned, "Mark Attendance dialog 'Earned Wages' preview for a full 9h day")
    .toEqual([DAILY, DAILY]);
  expect.soft(row.monthly, "MONTHLY WAGE for 2 days").toBe(2 * DAILY);
});

test("[bug] labour profile lists each logged day once", async ({ page }) => {
  await payrollFixture(page);
  const logs = await profileLogs(page);
  const dates = logs.map((l) => l.date);
  expect(dates, "Recent Site Check-In & Work Logs rows").toEqual([...new Set(dates)]);
});

// ---------------------------------------------------------------------------
// Deleting a project with payments
// ---------------------------------------------------------------------------

test("[bug] deleting a project that has payments is refused or keeps its payments", async ({
  page,
}) => {
  const P = await createProject(page, "Delete Customer", 20_000);
  await receivePaymentInProject(page, P.projectId, 5_000);
  await expect.poll(() => paymentsForProject(page, P.projectId)).toBe(1);

  await navTo(page, "/projects");
  await search(page, P.projectId);
  await rowWith(page, P.projectId).locator("button[title='Delete Project']").click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(2000);

  const kept = (await findProjectId(page, P.customer)).includes(P.projectId);
  expect(
    await paymentsForProject(page, P.projectId),
    `payments after delete (project ${kept ? "kept" : "deleted"})`,
  ).toBe(1);
});

// ---------------------------------------------------------------------------
// Best-effort cleanup of the stock items created above
// ---------------------------------------------------------------------------

test.afterAll(async ({ browser, baseURL }) => {
  const page = await browser.newPage({ baseURL });
  try {
    await loginAs(page, "CEO");
    for (const [path, name, ph] of [
      ["/machines", RUN, "Search..."],
      ["/materials", MAT, /Search Material Name/],
    ] as const) {
      await navTo(page, path);
      await search(page, name, ph);
      const rows = rowWith(page, name);
      for (let i = await rows.count(); i > 0; i--) {
        await rows.first().locator("button[title^='Delete']").click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
        await page.waitForTimeout(800);
      }
    }
  } catch {
    // cleanup is best-effort; E2E- prefixed rows can be removed manually
  } finally {
    await page.close();
  }
});
