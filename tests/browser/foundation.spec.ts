import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";

// These tests run only against the already-running synthetic demo.
const password =
  process.env.DEVELOPMENT_PASSWORD ??
  parseEnv(readFileSync("apps/api/.env", "utf8")).DEVELOPMENT_PASSWORD;
async function signIn(page: Page, email: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("operator onboards a clinic, owner configures it, and support access is explicit", async ({
  page,
}) => {
  await page.goto("/");
  await signIn(page, "operator@example.test");
  await expect(
    page.getByRole("heading", { name: "1. Provision an account" }),
  ).toBeVisible();
  const suffix = randomBytes(4).toString("hex");
  const email = `owner-${suffix}@example.test`;
  await page.getByLabel("Full name").fill("Browser test owner");
  await page.getByLabel("Account email").fill(email);
  await page.getByLabel("Initial password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Account created");
  await page.getByLabel("Clinic name").fill(`Browser clinic ${suffix}`);
  await page.getByLabel("Clinic URL slug").fill(`browser-${suffix}`);
  await page.getByLabel("Existing owner's email").fill(email);
  await page
    .getByRole("button", { name: "Create clinic", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Clinic created");
  const clinic = page.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      name: `Browser clinic ${suffix}`,
      exact: true,
    }),
  });
  await clinic
    .getByLabel("Reason for support access")
    .fill("Verify browser onboarding result");
  await clinic.getByRole("button", { name: "Start read-only support" }).click();
  await expect(
    page.getByRole("heading", { name: `Support: Browser clinic ${suffix}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End support access" }).click();
  await expect(page.getByRole("status")).toContainText("Support access ended");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Operator sign in" }),
  ).toBeVisible();
  await page.goto("http://localhost:3001/");
  await signIn(page, email);
  await expect(
    page.getByRole("heading", {
      name: `Browser clinic ${suffix}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Timezone").fill("America/Chicago");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved");
  await expect(
    page.getByText("clinic.settings.updated", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
});

test("staff has a read-only dashboard and no operator console access", async ({
  page,
}) => {
  await page.goto("http://localhost:3001/");
  await signIn(page, "staff@example.test");
  await expect(
    page.getByText("Only owners and managers can change clinic settings."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save settings" })).toHaveCount(
    0,
  );
  await page.goto("http://localhost:3002/");
  await expect(
    page.getByRole("heading", { name: "Operator access required" }),
  ).toBeVisible();
});

test("loading, network failure with recovery, and empty clinic states", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/me", async (route) => {
    await gate;
    await route.abort();
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Loading console…");
  release();
  await expect(page.getByRole("alert")).toContainText("Cannot reach DentalHQ");
  await page.unroute("**/api/me");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await signIn(page, "operator@example.test");
  await page.goto("http://localhost:3001/");
  await expect(
    page.getByRole("heading", { name: "No clinic access yet" }),
  ).toBeVisible();
  await page.route("**/api/operator/clinics", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("http://localhost:3002/");
  await expect(
    page.getByText("No clinics yet.", { exact: false }),
  ).toBeVisible();
});

test("public booking, missing-route recovery, keyboard access, and desktop layout", async ({
  page,
}) => {
  await page.goto("http://localhost:3001/booking");
  await expect(
    page.getByText("This is booking", { exact: true }),
  ).toBeVisible();
  await page.goto("http://localhost:3001/missing");
  await page.getByRole("link", { name: "Return to dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Clinic sign in" }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3002/");
  await expect(
    page.getByRole("heading", { name: "Operator sign in" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/console-desktop.png",
    fullPage: true,
  });
});
