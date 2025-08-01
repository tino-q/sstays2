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
    await expect(page.locator("h1")).toContainText("🏥 Health Check");
  });

  test.only("should show loading state initially then display health data", async ({
    page,
  }) => {
    // Should show loading initially
    await expect(page.locator(".loading")).toContainText(
      "Loading health status..."
    );

    // Wait for health data to load (API calls complete)
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Loading should disappear
    await expect(page.locator(".loading")).not.toBeVisible();
  });

  test.skip("should display complete health check information", async ({
    page,
  }) => {
    // Wait for page to load completely
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Check basic health section
    await expect(page.locator("h2")).toContainText("📊 Basic Status");
    await expect(page.locator(".status-badge.ok")).toContainText("✅ OK");

    // Check basic health details
    await expect(page.locator(".health-details")).toContainText(
      "Service: cleaning-management-api"
    );
    await expect(page.locator(".health-details")).toContainText(
      "Version: 1.0.0"
    );
    await expect(page.locator(".health-details")).toContainText("Timestamp:");

    // Check detailed health section
    await expect(page.locator("h2")).toContainText("🔍 Detailed Status");

    // Check individual health checks
    await expect(page.locator(".check-item")).toContainText("Database");
    await expect(page.locator(".check-item")).toContainText("Supabase");
    await expect(page.locator(".check-item")).toContainText("Environment");

    // Check that all checks are OK (green checkmarks)
    const checkStatuses = page.locator(".check-status.ok");
    await expect(checkStatuses).toHaveCount(3); // Database, Supabase, Environment

    // Check database version is displayed (proves real DB connection)
    await expect(page.locator(".checks")).toContainText("PostgreSQL");
  });

  test.skip("should display database connection details", async ({ page }) => {
    // Wait for health data to load
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Check database section specifically
    const databaseCheck = page
      .locator(".check-item")
      .filter({ hasText: "Database" });
    await expect(databaseCheck).toBeVisible();
    await expect(databaseCheck.locator(".check-status.ok")).toBeVisible();

    // Check for response time (proves API call happened)
    await expect(databaseCheck).toContainText("Response time:");
    await expect(databaseCheck).toContainText("Last checked:");

    // Check PostgreSQL version is displayed (proves real database query)
    await expect(page.locator(".checks")).toContainText("PostgreSQL");
    await expect(page.locator(".checks")).toContainText(
      "aarch64-unknown-linux-gnu"
    );
  });

  test.skip("should display all required health check components", async ({
    page,
  }) => {
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Supabase check
    const supabaseCheck = page
      .locator(".check-item")
      .filter({ hasText: "Supabase" });
    await expect(supabaseCheck).toBeVisible();
    await expect(supabaseCheck.locator(".check-status.ok")).toBeVisible();
    await expect(supabaseCheck).toContainText("Response time:");

    // Environment check
    const envCheck = page
      .locator(".check-item")
      .filter({ hasText: "Environment" });
    await expect(envCheck).toBeVisible();
    await expect(envCheck.locator(".check-status.ok")).toBeVisible();
    await expect(envCheck).toContainText(
      "All required environment variables are set"
    );
  });

  test.skip("should have functional refresh button", async ({ page }) => {
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Check refresh button exists
    const refreshButton = page.locator(".refresh-btn");
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toContainText("🔄 Refresh");

    // Click refresh button (this should reload the page)
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/health") && response.status() === 200
    );

    await refreshButton.click();

    // Verify the page reloaded by waiting for new health API calls
    await responsePromise;
  });

  test.skip("should make actual API calls to backend", async ({ page }) => {
    // Listen for network requests
    const healthRequests = [];
    const detailedRequests = [];

    page.on("response", (response) => {
      if (response.url().includes("/health/detailed")) {
        detailedRequests.push(response);
      } else if (response.url().includes("/health")) {
        healthRequests.push(response);
      }
    });

    // Navigate to page and wait for completion
    await page.goto("/");
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Verify API calls were made
    expect(healthRequests.length).toBeGreaterThan(0);
    expect(detailedRequests.length).toBeGreaterThan(0);

    // Verify responses were successful
    expect(healthRequests[0].status()).toBe(200);
    expect(detailedRequests[0].status()).toBe(200);

    // Check response headers
    expect(healthRequests[0].headers()["content-type"]).toContain(
      "application/json"
    );
    expect(detailedRequests[0].headers()["content-type"]).toContain(
      "application/json"
    );
  });

  test.skip("should handle page refresh gracefully", async ({ page }) => {
    // Load page initially
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Refresh the page
    await page.reload();

    // Should show loading again
    await expect(page.locator(".loading")).toContainText(
      "Loading health status..."
    );

    // Should load health data again
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".loading")).not.toBeVisible();
  });

  test.skip("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still load correctly
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // All elements should be visible
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".health-section")).toBeVisible();
    await expect(page.locator(".refresh-btn")).toBeVisible();

    // Check that content fits in mobile viewport
    const container = page.locator(".container");
    await expect(container).toBeVisible();
  });

  test.skip("should display timestamps in readable format", async ({
    page,
  }) => {
    await expect(page.locator(".status-badge.ok")).toBeVisible({
      timeout: 10000,
    });

    // Check timestamp format in basic health
    const basicTimestamp = page
      .locator(".health-details")
      .filter({ hasText: "Timestamp:" });
    await expect(basicTimestamp).toBeVisible();

    // Should contain date/time format (not ISO string)
    const timestampText = await basicTimestamp.textContent();
    expect(timestampText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY format

    // Check detailed timestamps
    const detailedTimestamps = page.locator(".check-timestamp");
    const count = await detailedTimestamps.count();
    expect(count).toBeGreaterThan(0);
  });
});
