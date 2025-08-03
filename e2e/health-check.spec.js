import { test, expect } from "@playwright/test";

test.describe("Health Check Page - End to End", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the health check page
    await page.goto("/");
  });

  test("should load health check page and display title", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle("Cleaning Management App");

    // Check main heading
    await expect(page.locator("h2")).toContainText(
      "PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit"
    );
  });
});
