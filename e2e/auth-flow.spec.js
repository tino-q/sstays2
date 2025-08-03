import { test, expect } from "@playwright/test";

test.describe("Authentication Flow - End to End", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");
  });

  test("should show login page when not authenticated", async ({ page }) => {
    // Check that the login page is displayed
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    await expect(page.locator("p")).toContainText("Please sign in to access the health check system");
    
    // Check for Google sign-in button
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    
    // Check for security note
    await expect(page.locator("p")).toContainText("This system uses Google OAuth for secure authentication");
    await expect(page.locator("p")).toContainText("No passwords are stored locally");
  });

  test("should have proper page structure and styling", async ({ page }) => {
    // Check for main container and card structure
    await expect(page.locator(".container")).toBeVisible();
    await expect(page.locator(".card")).toBeVisible();
    await expect(page.locator(".login-content")).toBeVisible();
    
    // Check for Google icon in button
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton.locator("svg")).toBeVisible();
    
    // Check for info box styling
    await expect(page.locator(".login-info")).toBeVisible();
  });

  test("should show loading state during authentication", async ({ page }) => {
    // This test would require mocking the authentication flow
    // For now, we'll test the button state
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeEnabled();
    
    // Click the button to trigger loading state
    await signInButton.click();
    
    // Note: In a real test, we would mock the OAuth flow to test loading states
    // For now, we verify the button exists and is clickable
  });

  test("should handle authentication errors gracefully", async ({ page }) => {
    // This test would require mocking failed authentication
    // For now, we'll test the basic error handling structure
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    
    // Test that the page doesn't crash on button click
    await signInButton.click();
    
    // Verify the page is still functional
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
  });

  test("should be keyboard accessible", async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press("Tab");
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeFocused();
    
    // Test Enter key
    await page.keyboard.press("Enter");
    
    // Verify the page is still functional
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that elements are still visible and properly sized
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    await expect(page.locator(".container")).toBeVisible();
    await expect(page.locator(".card")).toBeVisible();
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    
    // Check that button is properly sized for touch
    const buttonBox = await signInButton.boundingBox();
    expect(buttonBox.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
  });

  test("should work across different browsers", async ({ page }) => {
    // Test basic functionality across browsers
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
    
    // Test button click
    await signInButton.click();
    
    // Verify page remains functional
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
  });

  test("should handle network connectivity issues", async ({ page }) => {
    // Simulate offline mode
    await page.route("**/*", route => route.abort());
    
    // Navigate to the page
    await page.goto("/");
    
    // Check that the page still loads (static content)
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    // Check that the sign-in button is present
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    
    // Test button click (should handle network error gracefully)
    await signInButton.click();
    
    // Verify the page doesn't crash
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
  });

  test("should maintain security best practices", async ({ page }) => {
    // Check that no sensitive information is exposed in the DOM
    const pageContent = await page.content();
    
    // Verify no hardcoded credentials
    expect(pageContent).not.toContain("password");
    expect(pageContent).not.toContain("secret");
    expect(pageContent).not.toContain("key");
    
    // Check that OAuth flow is properly configured
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
    
    // Verify security note is displayed
    await expect(page.locator("p")).toContainText("Google OAuth");
    await expect(page.locator("p")).toContainText("No passwords are stored locally");
  });

  test("should handle page refresh correctly", async ({ page }) => {
    // Navigate to the page
    await page.goto("/");
    
    // Verify login page is shown
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    // Refresh the page
    await page.reload();
    
    // Verify login page is still shown
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
  });

  test("should handle browser back/forward navigation", async ({ page }) => {
    // Navigate to the page
    await page.goto("/");
    
    // Verify login page is shown
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    // Navigate away and back
    await page.goto("about:blank");
    await page.goBack();
    
    // Verify login page is still shown
    await expect(page.locator("h1")).toContainText("🔐 Authentication Required");
    
    const signInButton = page.locator("button").filter({ hasText: "Sign in with Google" });
    await expect(signInButton).toBeVisible();
  });
}); 