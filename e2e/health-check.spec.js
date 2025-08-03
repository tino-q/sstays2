import { test, expect } from "@playwright/test";
import {
  setupTestUser,
  cleanupTestUser,
  authenticateInBrowser,
} from "./helpers/auth-helper.js";

test.describe("Health Check Page - Smoke Tests", () => {
  let testCredentials;

  test.beforeAll(async () => {
    // Create a test user before running tests
    testCredentials = await setupTestUser();
  });

  test.afterAll(async () => {
    // Clean up the test user after tests (only if real user was created)
    await cleanupTestUser();
  });

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

  test("should show health check when authenticated", async ({ page }) => {
    // Use the test user credentials to authenticate (real or mock)
    await authenticateInBrowser(page, testCredentials);

    // Now test the health check functionality
    await expect(page.locator("h1")).toContainText("🏥 Health Check");
    await expect(page.locator("button")).toContainText("Sign Out");

    // Test that the health check data loads - use more specific selectors
    await expect(page.locator("h2")).toContainText("System Status");
    await expect(page.locator("text=Database:")).toBeVisible();

    // Assert that PostgreSQL 17.4 is displayed somewhere on the page
    await expect(page.locator("text=PostgreSQL 17.4")).toBeVisible();
  });
});
