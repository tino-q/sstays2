/**
 * Integration tests for health endpoints
 * These tests run against actual Supabase Edge Functions and database
 */

import { IntegrationTestHelper } from "./test-utils";

interface HealthCheck {
  status: string;
  responseTime?: number;
  timestamp: string;
  version?: string;
  error?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  checks: {
    database: HealthCheck;
    supabase: HealthCheck;
    environment: HealthCheck;
  };
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

describe("Health Endpoint - Integration Tests", () => {
  let testHelper: IntegrationTestHelper;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
  });

  beforeEach(() => testHelper.prepareDatabase());

  describe("Health Endpoint", () => {
    test("should return 200 and correct structure for /health", async () => {
      const response = await testHelper.authenticatedRequest("/health");
      const data = (await response.json()) as HealthResponse;

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );

      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("checks");
      expect(data).toHaveProperty("authenticated", true);
      expect(data).toHaveProperty("user");

      // Verify timestamp is recent (within last 10 seconds)
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(10000);
    });

    test("should include proper CORS headers", async () => {
      const response = await testHelper.authenticatedRequest("/health");

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "authorization"
      );
    });

    test("should return detailed health with database connection", async () => {
      const response = await testHelper.authenticatedRequest("/health");
      const data = (await response.json()) as HealthResponse;

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("checks");

      // Check database health - should be OK in integration tests
      expect(data.checks).toHaveProperty("database");
      expect(data.checks.database.status).toBe("ok");
      expect(data.checks.database).toHaveProperty("responseTime");
      expect(data.checks.database).toHaveProperty("timestamp");
      expect(data.checks.database).toHaveProperty("version");
      expect(data.checks.database.version).toMatch(/PostgreSQL/);

      // Check Supabase API health
      expect(data.checks).toHaveProperty("supabase");
      expect(data.checks.supabase).toHaveProperty("status");

      // Check environment health
      expect(data.checks).toHaveProperty("environment");
      expect(data.checks.environment).toHaveProperty("status");
    });

    test("should return 404 for unknown endpoints", async () => {
      const response = await testHelper.authenticatedRequest("/unknown");
      const text = await response.text();

      expect(response.status).toBe(404);
      expect(text).toBe("Function not found");
    });

    test("should respond quickly (under 500ms)", async () => {
      const start = Date.now();
      const response = await testHelper.authenticatedRequest("/health");
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(end - start).toBeLessThan(500);
    });
  });
});
