import { test, expect } from "@playwright/test";

test.describe("Authentication Flow - Smoke Tests", () => {
  test("should show login page with proper content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(
      "🔐 Authentication Required"
    );
    await expect(page.locator("p").first()).toContainText(
      "Please sign in to access the health check system"
    );
    await expect(page.locator("button")).toContainText("Sign in with Google");
  });

  test("should have basic page structure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".container")).toBeVisible();
    await expect(page.locator(".card")).toBeVisible();
    await expect(page.locator("button")).toBeVisible();
  });
});
