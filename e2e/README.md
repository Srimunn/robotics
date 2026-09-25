# End-to-end tests (Playwright)

> **These tests create, edit and delete data** (enquiries, projects, payments, discounts, tools,
> materials, labours, attendance). Run them **only** against a local or throwaway staging database.
> **Never** point them at production (`*.railway.app`) or at a production `DATABASE_URL`.

## Files

| File | What it does |
| --- | --- |
| `crawl.spec.ts` | Logs in as CEO and visits every route in `src/routes`, including `/tools/<machineId>`. Clicks every tab and filter toggle. Fails on page errors, `console.error`, 5xx responses or the "Application Error" screen. Also has a login smoke test for each role, the view-only (CS) checks and the Labour-portal checks. |
| `logic.spec.ts` | Business rules checked through the UI: enquiry to project conversion, payments and balances, discounts, machine issue and return, material issue, payroll, and deleting a project that has payments. |
| `helpers.ts` | Login helpers, the error collector and label-based field lookup (the app's `<Label>`s have no `htmlFor`). |
| `target-guard.ts`, `global-setup.ts` | The production guard (see below) and the per-run id and state file. |

Every record a test creates is named `E2E-<run id> …`. Stock items are deleted after the run where possible. Enquiries, projects, payments and labours are left in place, so reset the database between runs if you need a clean slate.

Tests with **`[bug]`** in the title check the *correct* behaviour for a known or newly found defect. They are expected to fail until that defect is fixed. To run only the tests that should pass today:

```bash
npx playwright test --grep-invert "\[bug\]"
```

## Running locally against a throwaway database

```bash
# 1. A throwaway Postgres database (example: local Postgres 16 on port 55432)
psql -h 127.0.0.1 -p 55432 -U postgres -c 'create database erp_e2e'
export DATABASE_URL='postgresql://postgres@127.0.0.1:55432/erp_e2e?schema=public'

# 2. Schema and seed data
npx prisma migrate deploy
# The committed migrations are behind prisma/schema.prisma (for example, Project.discountAmount,
# isGST and AttendanceRecord.dailyWage have no migration). Until a migration is added, sync the
# throwaway DB like this, or the app fails with "column ... does not exist":
npx prisma db push --skip-generate
npx prisma db seed

# 3. Dev server (in another terminal)
NO_PROXY=127.0.0.1,localhost npx vite dev --port 5175 --host 127.0.0.1

# 4. Tests
NO_PROXY=127.0.0.1,localhost npm run test:e2e
npx playwright show-report "$(node -p 'require("os").tmpdir()')/robotics-e2e/report"
```

The suite uses the Chromium that is already installed (`PLAYWRIGHT_BROWSERS_PATH`); it does not need `playwright install`. `@playwright/test` is pinned to the same version as the browsers (1.56.1). Chromium runs with `--no-proxy-server`, so requests to localhost skip any HTTP proxy. The Playwright config also blocks third-party requests and the PWA service worker.

Traces, screenshots and the HTML report are written to `$TMPDIR/robotics-e2e` (you can change this with `E2E_ARTIFACTS_DIR`). They must stay outside the repo: Vite watches the project root and reloads the app whenever Playwright writes trace files there.

## Production guard

`e2e/target-guard.ts` runs in global setup and again in every test's `page` fixture:

- The run is **aborted** if the base URL's host is not `localhost`, `127.0.0.1` or `::1`.
- A remote host is allowed only when `E2E_ALLOW_REMOTE=1` is set. Use this only for a throwaway staging deployment.
- Any host containing `railway.app` is **always** refused, even with `E2E_ALLOW_REMOTE=1`.
- The run is also refused if the test process's `DATABASE_URL` looks like a Railway database.
- Inside the browser, every request to `*.railway.app` is aborted, and so is every request to another origin.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_BASE_URL` | `http://127.0.0.1:5175` | The app under test |
| `E2E_ALLOW_REMOTE` | unset | Set to `1` to allow a non-local **staging** host. `railway.app` is never allowed. |
| `E2E_CEO_PIN`, `E2E_RS_PIN`, `E2E_DRS_PIN`, `E2E_CS_PIN`, `E2E_BS_PIN` | `1234`, `5678`, `9753`, `2468`, `8642` | Role PINs. Set them to match the server's `ROLE_PIN_*`. |
| `E2E_LABOUR_NAME`, `E2E_LABOUR_PIN` | unset | Labour used for the Labour-portal checks. If unset, the test creates a throwaway labour with PIN `4321`, because seeded labour PINs are random (`prisma/seed.ts` prints them). |
| `E2E_ARTIFACTS_DIR` | `$TMPDIR/robotics-e2e` | Where traces, screenshots and the report are written |
