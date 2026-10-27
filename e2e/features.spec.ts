/**
 * Checks for: customers table, Excel/PDF downloads on every list page, B2B/B2C and GST on enquiries,
 * the report filters, and payment / follow-up reminders.
 *
 * !!! Creates and edits enquiries and projects. Run ONLY against a local / throwaway database
 * (see e2e/README.md). Expected values are computed straight from the database with Prisma, so
 * DATABASE_URL must point at the same local database as the dev server.
 */
import type { Download, Locator, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { test, expect, loginAs, navTo, RUN_ID, fieldInput, expectToast } from "./helpers";

const RUN = RUN_ID;
const main = (page: Page) => page.locator("main");

if (/railway/i.test(process.env.DATABASE_URL || ""))
  throw new Error("Refusing to run against Railway");
const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());

test.beforeEach(async ({ page }) => {
  await loginAs(page, "CEO");
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

function localToday(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function readXlsx(dl: Download): Promise<Record<string, any>[]> {
  const path = await dl.path();
  const wb = XLSX.read(fs.readFileSync(path!), { type: "buffer" });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
}

async function downloadExcel(page: Page, button: Locator) {
  const [dl] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return { name: dl.suggestedFilename(), rows: await readXlsx(dl) };
}

/** Clicks a PDF button and returns the number of table rows in the print window. */
async function pdfRowCount(page: Page, button: Locator) {
  const [popup] = await Promise.all([page.waitForEvent("popup"), button.click()]);
  await popup.waitForLoadState("domcontentloaded");
  const n = await popup.locator("tbody tr").count();
  const title = await popup.title();
  await popup.close();
  return { n, title };
}

async function countInTitle(scope: Locator, re: RegExp) {
  const text = await scope.innerText();
  const m = text.match(re);
  expect(m, `count matching ${re}`).toBeTruthy();
  return Number(m![1]);
}

async function createEnquiry(
  page: Page,
  customer: string,
  amount: number,
  kind: { type?: "B2B" | "B2C"; gst?: "GST" | "Non-GST" } = {},
  followUp?: string,
) {
  await navTo(page, "/enquiries");
  await main(page).getByRole("button", { name: "New Enquiry" }).click();
  const dialog = page.getByRole("dialog");
  await fieldInput(dialog, "Name *").fill(customer);
  await fieldInput(dialog, "Phone 1 *").fill(`8${String(Date.now()).slice(-9)}`);
  await fieldInput(dialog, "Location").fill("Salem");
  await fieldInput(dialog, "Amount (₹)").fill(String(amount));
  if (kind.type) await dialog.getByRole("radio", { name: kind.type, exact: true }).click();
  if (kind.gst) await dialog.getByRole("radio", { name: kind.gst, exact: true }).click();
  if (followUp) {
    await fieldInput(dialog, "Next Follow-up Date").fill(followUp);
    await fieldInput(dialog, "Follow-up Note").fill("Ask about the second building");
  }
  await dialog.getByRole("button", { name: "Save Enquiry" }).click();
  return dialog;
}

async function enquiryRow(customer: string) {
  return db.enquiry.findFirst({ where: { customerName: customer } });
}

// ---------------------------------------------------------------------------
// 1. Customers table
// ---------------------------------------------------------------------------

test("customers: one table row per customer and the Excel totals match the database", async ({
  page,
  errors,
}) => {
  test.setTimeout(180_000);
  await navTo(page, "/customers");
  const table = main(page).getByTestId("customers-table");
  await expect(table).toBeVisible();
  await expect(main(page).locator("text=Total Contract Value:")).toHaveCount(0); // old cards are gone

  const [enqs, projs] = await Promise.all([
    db.enquiry.findMany({ select: { customerName: true } }),
    db.project.findMany({
      select: { customerName: true, projectValue: true, receivedAmount: true },
    }),
  ]);
  const names = new Set([...enqs, ...projs].map((x) => norm(x.customerName)).filter(Boolean));

  const total = await countInTitle(main(page), /Customers \((\d+)\)/);
  expect(total).toBe(names.size);

  const { name, rows } = await downloadExcel(page, main(page).getByTestId("export-excel"));
  expect(name).toMatch(/^Customers_\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(rows.length).toBe(names.size); // whole list, not one page

  const expected = new Map<
    string,
    { value: number; received: number; enq: number; proj: number }
  >();
  for (const n of names) expected.set(n, { value: 0, received: 0, enq: 0, proj: 0 });
  for (const e of enqs) expected.get(norm(e.customerName))!.enq++;
  for (const p of projs) {
    const x = expected.get(norm(p.customerName))!;
    x.proj++;
    x.value += Number(p.projectValue);
    x.received += Number(p.receivedAmount);
  }
  for (const r of rows) {
    const x = expected.get(norm(r["Customer Name"]));
    expect(x, `customer ${r["Customer Name"]}`).toBeTruthy();
    expect(r.Enquiries).toBe(x!.enq);
    expect(r.Projects).toBe(x!.proj);
    expect(r["Contract Value (INR)"]).toBeCloseTo(x!.value, 2);
    expect(r["Collected (INR)"]).toBeCloseTo(x!.received, 2);
    expect(r["Pending (INR)"]).toBeCloseTo(Math.max(0, x!.value - x!.received), 2);
  }

  // Sorting by Pending puts the largest pending amount first.
  await table.getByRole("button", { name: /^Pending/ }).click();
  const firstPending = await table.locator("tbody tr").first().locator("td").nth(10).innerText();
  const maxPending = Math.max(...rows.map((r) => r["Pending (INR)"]));
  expect(Number(firstPending.replace(/[^\d.]/g, ""))).toBe(Math.round(maxPending));

  // "Has pending amount" filter
  await main(page).getByRole("button", { name: "Has pending amount" }).click();
  const pendingCount = await countInTitle(main(page), /Customers \((\d+)\)/);
  expect(pendingCount).toBe(rows.filter((r) => r["Pending (INR)"] > 0).length);

  // Clicking a row still opens the existing detail window.
  await table.locator("tbody tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Payment Transactions Ledger");
  expect(errors.unexpected()).toEqual([]);
});

// ---------------------------------------------------------------------------
// 2. Excel + PDF on every list page
// ---------------------------------------------------------------------------

const MODULES: { path: string; title?: RegExp; file: RegExp }[] = [
  { path: "/enquiries", title: /Enquiries \((\d+)\)/, file: /^Enquiries_/ },
  { path: "/projects", title: /Projects \((\d+)\)/, file: /^Projects_/ },
  { path: "/customers", title: /Customers \((\d+)\)/, file: /^Customers_/ },
  { path: "/payments", file: /^Payments_Receivables_/ },
  { path: "/machines", file: /^Tools_/ },
  { path: "/materials", file: /^Materials_/ },
  { path: "/labours", file: /^Labours_/ },
  { path: "/engineers", file: /^Engineers_/ },
  { path: "/attendance", file: /^Attendance_/ },
];

for (const m of MODULES) {
  test(`downloads: ${m.path} has Excel and PDF of the full filtered list`, async ({
    page,
    errors,
  }) => {
    await navTo(page, m.path);
    const excelBtn = main(page).getByTestId("export-excel").first();
    const pdfBtn = main(page).getByTestId("export-pdf").first();
    await expect(excelBtn).toBeVisible();
    await expect(pdfBtn).toBeVisible();
    const shown = m.title ? await countInTitle(main(page), m.title) : undefined;
    if (shown === 0) return; // nothing to export (empty module on this database)
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 10_000 }).catch(() => null),
      excelBtn.click(),
    ]);
    if (!dl) {
      // Empty list: the app says so instead of downloading an empty file.
      await expectToast(page, "Nothing to export");
      return;
    }
    expect(dl.suggestedFilename()).toMatch(m.file);
    expect(dl.suggestedFilename()).toMatch(/\.xlsx$/);
    const rows = await readXlsx(dl);
    expect(rows.length).toBeGreaterThan(0);
    if (shown !== undefined) expect(rows.length).toBe(shown);
    const pdf = await pdfRowCount(page, pdfBtn);
    expect(pdf.n).toBe(rows.length);
    expect(errors.unexpected()).toEqual([]);
  });
}

test("downloads: enquiries export follows the filters", async ({ page }) => {
  await navTo(page, "/enquiries");
  await main(page).getByRole("button", { name: "Cancelled", exact: true }).click();
  const shown = await countInTitle(main(page), /Enquiries \((\d+)\)/);
  const { rows } = await downloadExcel(page, main(page).getByTestId("export-excel"));
  expect(rows.length).toBe(shown);
  expect(rows.every((r) => r.Decision === "Cancelled")).toBe(true);
  expect(shown).toBe(await db.enquiry.count({ where: { customerDecision: "Cancelled" } }));
});

test("downloads: CS (view-only) can download, numbers stay numbers", async ({ page }) => {
  await loginAs(page, "CS");
  await navTo(page, "/projects");
  const { rows } = await downloadExcel(page, main(page).getByTestId("export-excel"));
  expect(rows.length).toBe(await db.project.count());
  expect(typeof rows[0]["Contract Value (INR)"]).toBe("number");
});

// ---------------------------------------------------------------------------
// 3. B2B / B2C on enquiries
// ---------------------------------------------------------------------------

test("B2B/B2C and GST: both required, independent, saved, filtered, and copied to the project", async ({
  page,
  errors,
}) => {
  test.setTimeout(240_000);
  errors.allow.push(/Please choose B2B or B2C/, /Please choose GST or Non-GST/);
  const b2bNon = `${RUN} B2B NonGST Builders`;
  const b2cGst = `${RUN} B2C GST Home`;

  // Without a type the form refuses to save; without GST too.
  let dialog = await createEnquiry(page, `${RUN} NoType`, 1000, { gst: "GST" });
  await expectToast(page, "Please choose B2B or B2C");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  dialog = await createEnquiry(page, `${RUN} NoType`, 1000, { type: "B2B" });
  await expectToast(page, "Please choose GST or Non-GST");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await enquiryRow(`${RUN} NoType`)).toBeNull();

  // The "unusual" combinations must both be possible.
  await createEnquiry(page, b2bNon, 40_000, { type: "B2B", gst: "Non-GST" });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
  await createEnquiry(page, b2cGst, 30_000, { type: "B2C", gst: "GST" });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
  expect(await enquiryRow(b2bNon)).toMatchObject({ customerType: "B2B", isGST: false });
  expect(await enquiryRow(b2cGst)).toMatchObject({ customerType: "B2C", isGST: true });

  // List shows both columns; the two filters work on their own and together.
  await main(page).getByPlaceholder("Search...").fill(RUN);
  const rowOf = (n: string) => main(page).locator("tbody tr").filter({ hasText: n });
  await expect(rowOf(b2bNon)).toContainText("B2B");
  await expect(rowOf(b2bNon)).toContainText("Non-GST");
  const choose = async (filter: string, option: string) => {
    await main(page).getByRole("combobox", { name: filter }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await choose("GST filter", "GST");
  await expect(rowOf(b2bNon)).toHaveCount(0);
  await expect(rowOf(b2cGst)).toHaveCount(1);
  await choose("Customer type filter", "B2B");
  await expect(rowOf(b2cGst)).toHaveCount(0);
  await choose("GST filter", "Non-GST");
  await expect(rowOf(b2bNon)).toHaveCount(1);
  await choose("Customer type filter", "All types");
  await choose("GST filter", "GST + Non-GST");

  // Approve + convert both: the project gets the same type and the same GST setting.
  for (const name of [b2bNon, b2cGst]) {
    await navTo(page, "/enquiries");
    await main(page).getByPlaceholder("Search...").fill(name);
    const row = rowOf(name);
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Approved", exact: true }).click();
    await row.getByRole("button", { name: /Convert to Project/i }).click();
    await page.waitForURL(/\/projects/, { timeout: 30_000 });
    await expect
      .poll(async () => (await enquiryRow(name))?.projectId, { timeout: 20_000 })
      .toBeTruthy();
  }
  expect(await db.project.findFirst({ where: { customerName: b2bNon } })).toMatchObject({
    customerType: "B2B",
    isGST: false,
  });
  expect(await db.project.findFirst({ where: { customerName: b2cGst } })).toMatchObject({
    customerType: "B2C",
    isGST: true,
  });

  // Changing the enquiry later updates its project too (same as other synced fields).
  const enq = await enquiryRow(b2cGst);
  await navTo(page, "/enquiries");
  await main(page).getByPlaceholder("Search...").fill(b2cGst);
  await rowOf(b2cGst).locator("td").nth(1).click();
  const d = page.getByRole("dialog");
  await d.getByRole("radio", { name: "Non-GST", exact: true }).click();
  await expect
    .poll(async () => (await db.project.findUnique({ where: { id: enq!.projectId! } }))!.isGST)
    .toBe(false);
  expect((await db.project.findUnique({ where: { id: enq!.projectId! } }))!.customerType).toBe("B2C");
  await page.keyboard.press("Escape");

  // And the B2B/B2C switch in the project window updates the enquiry, without touching GST.
  await navTo(page, `/projects?openId=${enq!.projectId}`);
  const pw = page.getByRole("dialog");
  await pw.getByRole("radiogroup", { name: "Customer type" }).getByRole("radio", { name: "B2B" }).click();
  await expect
    .poll(async () => (await db.project.findUnique({ where: { id: enq!.projectId! } }))!.customerType)
    .toBe("B2B");
  await expect.poll(async () => (await enquiryRow(b2cGst))!.customerType).toBe("B2B");
  expect((await enquiryRow(b2cGst))!.isGST).toBe(false);
  expect((await db.project.findUnique({ where: { id: enq!.projectId! } }))!.isGST).toBe(false);
  expect(errors.unexpected()).toEqual([]);
});

test("B2B/B2C and GST: older enquiries show 'Not set' for both and each can be set alone", async ({
  page,
}) => {
  const old = await db.enquiry.findFirst({
    where: { customerType: null, isGST: null, projectId: null },
    orderBy: { id: "asc" },
  });
  test.skip(!old, "no older enquiries in this database");
  const before = await db.enquiry.findUnique({ where: { id: old!.id } });
  await navTo(page, "/enquiries");
  await main(page).getByPlaceholder("Search...").fill(old!.id);
  const row = main(page).locator("tbody tr").filter({ hasText: old!.id });
  await expect(row.getByText("Not set", { exact: true })).toHaveCount(2);
  await row.locator("td").nth(1).click();
  const d = page.getByRole("dialog");
  await d.getByRole("radio", { name: "B2C", exact: true }).click();
  await expect
    .poll(async () => (await db.enquiry.findUnique({ where: { id: old!.id } }))!.customerType)
    .toBe("B2C");
  expect((await db.enquiry.findUnique({ where: { id: old!.id } }))!.isGST).toBeNull();
  await d.getByRole("radio", { name: "GST", exact: true }).click();
  await expect
    .poll(async () => (await db.enquiry.findUnique({ where: { id: old!.id } }))!.isGST)
    .toBe(true);
  // Only those two fields changed.
  const after = await db.enquiry.findUnique({ where: { id: old!.id } });
  expect({ ...after, customerType: null, isGST: null }).toEqual({ ...before, customerType: null, isGST: null });
});

// ---------------------------------------------------------------------------
// 4. Report filter
// ---------------------------------------------------------------------------

const REPORTS: { tab: string; excel: RegExp; file: RegExp }[] = [
  { tab: "Revenue", excel: /Excel|Download/i, file: /^Custom_Revenue_Report_/ },
  { tab: "Projects", excel: /Excel/i, file: /^Custom_Projects_Report_/ },
  { tab: "Pending", excel: /Excel/i, file: /^Custom_Pending_Collections_Report_/ },
  { tab: "Enquiries", excel: /Excel/i, file: /^Custom_Enquiries_Report_/ },
  { tab: "Ledger", excel: /Excel/i, file: /^Customer_Account_Ledger_/ },
];

for (const r of REPORTS) {
  test(`reports: ${r.tab} type and GST filters split All correctly, alone and combined`, async ({
    page,
    errors,
  }) => {
    test.setTimeout(120_000);
    await navTo(page, "/reports");
    await main(page)
      .getByRole("button", { name: new RegExp(`^${r.tab}$`) })
      .click();
    const typeBar = main(page).getByTestId("type-filter");
    const taxBar = main(page).getByTestId("tax-filter");
    const excel = main(page)
      .getByRole("button", { name: /Excel/i })
      .filter({ hasNotText: /All Logs/ })
      .first();
    const isTotal = (row: Record<string, any>) => Object.values(row).some((v) => /^GRAND TOTAL/.test(String(v)));
    const pick = async (type: RegExp, tax: RegExp) => {
      await typeBar.getByRole("button", { name: type }).click();
      await taxBar.getByRole("button", { name: tax }).click();
      const dl = await downloadExcel(page, excel);
      if (r.tab === "Pending") {
        // The Pending export ends with one GRAND TOTAL row of the amount still to collect.
        const last = dl.rows[dl.rows.length - 1];
        expect(last && isTotal(last), "Pending export ends with a GRAND TOTAL row").toBe(true);
        const data = dl.rows.filter((x) => !isTotal(x));
        const due = data.reduce((s, x) => s + Number(x["Outstanding Due (INR)"]), 0);
        expect(Number(last["Outstanding Due (INR)"])).toBeCloseTo(due, 2);
        return { ...dl, rows: data };
      }
      return dl;
    };
    const isEnq = r.tab === "Enquiries";
    const types = [/^B2B/, /^B2C/, /^Not set/];
    const taxes = isEnq ? [/^GST/, /^Non-GST/, /^Not set/] : [/^GST/, /^Non-GST/];
    const all = await pick(/^All/, /^All/);
    expect(all.name).not.toMatch(/B2B|B2C|GST|NotSet/);

    const b2bNon = await pick(/^B2B/, /^Non-GST/);
    expect(b2bNon.name).toContain("_B2B_NonGST");
    const b2cGst = await pick(/^B2C/, /^GST/);
    expect(b2cGst.name).toContain("_B2C_GST");
    const b2bOnly = await pick(/^B2B/, /^All/);
    expect(b2bOnly.name).toContain("_B2B");
    expect(b2bOnly.name).not.toContain("GST");
    const gstOnly = await pick(/^All/, /^GST/);
    expect(gstOnly.name).toContain("_GST");
    expect(gstOnly.name).not.toMatch(/B2B|B2C/);

    if (r.tab === "Ledger") {
      // A customer with several kinds of projects appears in several lists, so check money instead.
      const sum = (rows: any[]) =>
        rows.reduce((s, x) => s + Number(x["Total Lifetime Value (INR)"]), 0);
      let typeSum = 0;
      for (const t of types) typeSum += sum((await pick(t, /^All/)).rows);
      expect(typeSum).toBeCloseTo(sum(all.rows), 2);
      let taxSum = 0;
      for (const t of taxes) taxSum += sum((await pick(/^All/, t)).rows);
      expect(taxSum).toBeCloseTo(sum(all.rows), 2);
    } else {
      // Each split adds up to All, and the 2-way grid adds up too.
      let typeTotal = 0;
      for (const t of types) typeTotal += (await pick(t, /^All/)).rows.length;
      expect(typeTotal).toBe(all.rows.length);
      let taxTotal = 0;
      for (const t of taxes) taxTotal += (await pick(/^All/, t)).rows.length;
      expect(taxTotal).toBe(all.rows.length);
      let grid = 0;
      for (const t of types) for (const g of taxes) grid += (await pick(t, g)).rows.length;
      expect(grid).toBe(all.rows.length);

      // Check one combination row-by-row against the database.
      if (isEnq) {
        expect(b2bNon.rows.every((x) => x["Customer Type"] === "B2B" && x.GST === "Non-GST")).toBe(true);
        expect(b2bNon.rows.length).toBe(
          await db.enquiry.count({ where: { customerType: "B2B", isGST: false } }),
        );
      } else {
        const ids = b2cGst.rows.map((x) => x["Project ID"]);
        const rows = await db.project.findMany({
          where: { id: { in: ids } },
          select: { isGST: true, customerType: true },
        });
        expect(rows.length).toBe(ids.length);
        expect(rows.every((g) => g.isGST && g.customerType === "B2C")).toBe(true);
      }
    }
    expect(errors.unexpected()).toEqual([]);
  });
}

test("reports: Attendance and Payroll do not show the customer type filter", async ({ page }) => {
  await navTo(page, "/reports");
  for (const tab of ["Attendance", "Payroll"]) {
    await main(page)
      .getByRole("button", { name: new RegExp(`^${tab}$`) })
      .click();
    await expect(main(page).getByTestId("customer-type-filter")).toHaveCount(0);
  }
});

// ---------------------------------------------------------------------------
// 5. Reminders
// ---------------------------------------------------------------------------

/** Independent re-computation of the collection reminder list straight from the database. */
async function expectedPaymentReminders() {
  const horizon = localToday(3);
  const projects = await db.project.findMany({ include: { paymentStages: true } });
  let n = 0;
  for (const p of projects) {
    if (Number(p.balanceAmount) <= 0) continue;
    const open = p.paymentStages.filter(
      (s) => s.status !== "Paid" && Number(s.amount) - Number(s.paidAmount ?? 0) > 0,
    );
    if (open.length)
      n += open.filter((s) => s.dueDate.toISOString().slice(0, 10) <= horizon).length;
    else if (p.paymentStages.length === 0) {
      const due = (p.workCommittedDate ?? p.scheduledDate).toISOString().slice(0, 10);
      if (due <= horizon) n++;
    }
  }
  return n;
}

test("reminders: collections list matches the database and opens the project", async ({
  page,
  errors,
}) => {
  await navTo(page, "/notifications");
  await main(page).getByTestId("tab-collections").click();
  const expected = await expectedPaymentReminders();
  await expect(main(page)).toContainText(`Payment collections (${expected})`);
  const { rows } = await downloadExcel(page, main(page).getByTestId("export-excel"));
  expect(rows.length).toBe(expected);
  const today = localToday();
  for (const r of rows) {
    expect(r["Due Date"] <= localToday(3)).toBe(true);
    if (r["Due Date"] < today) expect(r.Status).toMatch(/overdue/);
  }
  if (rows.length) {
    await main(page)
      .getByTestId("collections-table")
      .getByRole("link", { name: "Open project" })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
  }
  expect(errors.unexpected()).toEqual([]);
});

test("reminders: follow-up date set on an enquiry shows in the bell and the page; Done and Reschedule only touch those fields", async ({
  page,
  errors,
}) => {
  test.setTimeout(180_000);
  const name = `${RUN} FollowUp Co`;
  await createEnquiry(page, name, 25_000, { type: "B2C", gst: "Non-GST" }, localToday(-1));
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
  const saved = await enquiryRow(name);
  expect(saved!.nextFollowUpDate!.toISOString().slice(0, 10)).toBe(localToday(-1));
  expect(saved!.followUpNote).toBe("Ask about the second building");

  // Enquiries list column + "Follow-ups Due" filter
  await main(page).getByRole("button", { name: "Follow-ups Due" }).click();
  await main(page).getByPlaceholder("Search...").fill(name);
  await expect(main(page).locator("tbody tr").filter({ hasText: name })).toContainText(
    localToday(-1),
  );

  // Bell
  await page.reload();
  await page.getByTestId("bell").click();
  // The bell previews the 4 most overdue of each kind; it must include follow-ups, not only payments.
  const menu = page.getByRole("menu");
  await expect(menu).toContainText("Follow up:");
  await expect(menu).toContainText("Collect ₹");
  const allCount = Number(
    (await menu.getByText(/View all reminders/).innerText()).match(/\((\d+)\)/)![1],
  );
  await page.keyboard.press("Escape");

  // Notifications page: in Overdue
  await navTo(page, "/notifications?tab=followups");
  const row = main(page).getByTestId(`followup-${saved!.id}`);
  await expect(row).toContainText("1 day overdue");
  const pageTotal =
    (await expectedPaymentReminders()) +
    Number(
      (
        await main(page)
          .getByText(/Enquiry follow-ups \(\d+\)/)
          .innerText()
      ).match(/\((\d+)\)/)![1],
    );
  expect(allCount).toBe(pageTotal);

  // Reschedule to tomorrow: only the date changes
  await row.getByRole("button", { name: /Reschedule/ }).click();
  await row.getByLabel("New follow-up date").fill(localToday(1));
  await row.getByRole("button", { name: "Save" }).click();
  await expect
    .poll(async () => (await enquiryRow(name))!.nextFollowUpDate?.toISOString().slice(0, 10))
    .toBe(localToday(1));
  const afterReschedule = await enquiryRow(name);
  expect({ ...afterReschedule, nextFollowUpDate: null }).toEqual({
    ...saved,
    nextFollowUpDate: null,
  });
  await expect(main(page).getByTestId(`followup-${saved!.id}`)).toContainText("Due in 1 day");

  // Done: clears the date and note, nothing else
  await main(page)
    .getByTestId(`followup-${saved!.id}`)
    .getByRole("button", { name: /Done/ })
    .click();
  await expect.poll(async () => (await enquiryRow(name))!.nextFollowUpDate).toBeNull();
  const afterDone = await enquiryRow(name);
  expect(afterDone!.followUpNote).toBeNull();
  expect({ ...afterDone, nextFollowUpDate: null, followUpNote: null }).toEqual({
    ...saved,
    nextFollowUpDate: null,
    followUpNote: null,
  });
  await expect(main(page).getByTestId(`followup-${saved!.id}`)).toHaveCount(0);
  expect(errors.unexpected()).toEqual([]);
});

test("reminders: approved or cancelled enquiries drop off the follow-up list", async ({ page }) => {
  const name = `${RUN} Cancel FollowUp`;
  await createEnquiry(page, name, 10_000, { type: "B2B", gst: "GST" }, localToday());
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
  const e = await enquiryRow(name);
  await navTo(page, "/notifications?tab=followups");
  await expect(main(page).getByTestId(`followup-${e!.id}`)).toContainText("Due today");
  await navTo(page, "/enquiries");
  await main(page).getByPlaceholder("Search...").fill(name);
  const row = main(page).locator("tbody tr").filter({ hasText: name });
  await row.getByRole("combobox").click();
  await page.getByRole("option", { name: "Cancelled", exact: true }).click();
  await expect.poll(async () => (await enquiryRow(name))!.customerDecision).toBe("Cancelled");
  await navTo(page, "/notifications?tab=followups");
  await expect(main(page).getByTestId("followups-table")).toBeVisible();
  await expect(main(page).getByTestId(`followup-${e!.id}`)).toHaveCount(0);
  // The date itself stays stored (nothing is deleted); it is just no longer a reminder.
  expect((await enquiryRow(name))!.nextFollowUpDate).not.toBeNull();
});

test("reminders: the bell count equals overdue + today items", async ({ page }) => {
  await navTo(page, "/notifications");
  const text = async (id: string) =>
    (await main(page).getByTestId(id).innerText()).replace(/\s+/g, " ");
  const parse = (t: string) => {
    const m = t.match(/(\d+) overdue · (\d+) today/);
    return Number(m![1]) + Number(m![2]);
  };
  const urgent = parse(await text("tab-collections")) + parse(await text("tab-followups"));
  if (urgent === 0) await expect(page.getByTestId("bell-count")).toHaveCount(0);
  else
    await expect(page.getByTestId("bell-count")).toHaveText(urgent > 99 ? "99+" : String(urgent));
});

test("reminders: CS (view-only) can mark a follow-up done", async ({ page }) => {
  const e = await db.enquiry.findFirst({
    where: {
      nextFollowUpDate: { lte: new Date(`${localToday()}T00:00:00Z`) },
      projectId: null,
      customerDecision: { in: ["FollowUp", "Thinking"] },
    },
  });
  test.skip(!e, "no due follow-ups in this database");
  await loginAs(page, "CS");
  await navTo(page, "/notifications?tab=followups");
  await main(page).getByTestId(`followup-${e!.id}`).getByRole("button", { name: /Done/ }).click();
  await expect
    .poll(async () => (await db.enquiry.findUnique({ where: { id: e!.id } }))!.nextFollowUpDate)
    .toBeNull();
});
