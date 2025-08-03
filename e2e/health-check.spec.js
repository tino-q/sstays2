import { test, expect } from "@playwright/test";

test.describe("Health Check Page - Smoke Tests", () => {
  test("should load login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(
      "🔐 Authentication Required"
    );
    await expect(page.locator("button")).toContainText("Sign in with Google");
  });

  test("should handle button click without crashing", async ({ page }) => {
    await page.goto("/");
    const signInButton = page
      .locator("button")
      .filter({ hasText: "Sign in with Google" });
    await signInButton.click();
    await expect(page.locator("h1").first()).toContainText("Sign in");
  });
});
