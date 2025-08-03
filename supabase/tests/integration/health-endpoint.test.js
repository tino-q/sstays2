/**
 * Integration tests for health endpoints
 * These tests run against actual Supabase Edge Functions and database
 */

const {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} = require("@jest/globals");
const { createClient } = require("@supabase/supabase-js");

const FUNCTION_URL = "http://localhost:54321/functions/v1";

// Test user data with unique email
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "testpassword123",
  user_metadata: {
    role: "admin",
    name: "Test User",
  },
};

let serviceRoleClient;
let supabaseClient;
let testUser;
let authToken;

describe("Health Endpoint - Integration Tests", () => {
  beforeAll(async () => {
    // Initialize Supabase clients
    const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

    serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Create a test user using service role
    try {
      // Create new test user
      const { data: newUser, error: createError } =
        await serviceRoleClient.auth.admin.createUser({
          email: TEST_USER.email,
          password: TEST_USER.password,
          user_metadata: TEST_USER.user_metadata,
          email_confirm: true,
        });

      if (createError) {
        console.error("Error creating test user:", createError);
        throw createError;
      }

      testUser = newUser.user;

      // Sign in with the test user to get a session
      const { data: sessionData, error: signInError } =
        await supabaseClient.auth.signInWithPassword({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

      if (signInError) {
        console.error("Error signing in:", signInError);
        throw signInError;
      }

      authToken = sessionData.session.access_token;

      if (!authToken) {
        throw new Error("Failed to get access token from session");
      }

      console.log("Test user created and authenticated:", testUser.email);
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test user if needed
    if (testUser) {
      try {
        await serviceRoleClient.auth.admin.deleteUser(testUser.id);
        console.log("Test user cleaned up");
      } catch (error) {
        console.error("Error cleaning up test user:", error);
      }
    }
  });

  describe("Health Endpoint", () => {
    test("should return 200 and correct structure for /health", async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

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
      const response = await fetch(`${FUNCTION_URL}/health`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "authorization"
      );
    });

    test("should return detailed health with database connection", async () => {
      const response = await fetch(`${FUNCTION_URL}/health`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

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
      const response = await fetch(`${FUNCTION_URL}/unknown`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const text = await response.text();

      expect(response.status).toBe(404);
      expect(text).toBe("Function not found");
    });

    test("should respond quickly (under 500ms)", async () => {
      const start = Date.now();
      const response = await fetch(`${FUNCTION_URL}/health`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(end - start).toBeLessThan(500);
    });

    test("should return 401 for requests without authentication", async () => {
      const response = await fetch(`${FUNCTION_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("msg");
      expect(data.msg).toContain("Missing authorization header");
    });
  });
});
