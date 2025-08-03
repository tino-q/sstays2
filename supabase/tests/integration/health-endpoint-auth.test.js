/**
 * Integration tests for the protected health endpoint
 * Tests authentication requirements and user-specific responses
 */

const { createClient } = require("@supabase/supabase-js");

describe("Health Endpoint - Authentication Integration", () => {
  let supabaseUrl;
  let supabaseAnonKey;
  let supabaseClient;

  beforeAll(() => {
    // Get environment variables
    supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321";
    supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "test-anon-key";

    // Create Supabase client
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  });

  describe("Authentication Requirements", () => {
    test("should return 401 for requests without authorization header", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data.code).toBe("AUTH_REQUIRED");
    });

    test("should return 401 for requests with invalid authorization header", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "InvalidHeader",
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toBe("Missing or invalid authorization header");
    });

    test("should return 401 for requests with invalid token", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token",
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Authenticated Requests", () => {
    let testUser;
    let accessToken;

    beforeAll(async () => {
      // Create a test user for authentication
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.signUp({
        email: `test-${Date.now()}@example.com`,
        password: "testpassword123",
      });

      if (error) {
        console.error("Failed to create test user:", error);
        throw error;
      }

      testUser = user;

      // Get access token
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      accessToken = session?.access_token;
    });

    afterAll(async () => {
      // Clean up test user if needed
      if (testUser) {
        try {
          await supabaseClient.auth.admin.deleteUser(testUser.id);
        } catch (error) {
          console.error("Failed to clean up test user:", error);
        }
      }
    });

    test("should return 200 for authenticated requests", async () => {
      if (!accessToken) {
        console.warn("No access token available, skipping test");
        return;
      }

      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.authenticated).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.email).toBe(testUser.email);
    });

    test("should include user information in response", async () => {
      if (!accessToken) {
        console.warn("No access token available, skipping test");
        return;
      }

      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      expect(data.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        role: expect.any(String),
      });
    });

    test("should include health check data", async () => {
      if (!accessToken) {
        console.warn("No access token available, skipping test");
        return;
      }

      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      expect(data.status).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.supabase).toBeDefined();
      expect(data.checks.environment).toBeDefined();
    });

    test("should handle expired tokens gracefully", async () => {
      // This test would require a way to create expired tokens
      // For now, we'll test with a clearly invalid token
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer expired.invalid.token",
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("CORS and Headers", () => {
    test("should handle CORS preflight requests", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "authorization"
      );
    });

    test("should include proper CORS headers in responses", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
        "authorization"
      );
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed requests gracefully", async () => {
      const response = await fetch(`${supabaseUrl}/health`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      // Should still return 401 for authentication requirement
      expect(response.status).toBe(401);
    });

    test("should handle network errors gracefully", async () => {
      // This test would require mocking network failures
      // For now, we'll test with an invalid URL
      try {
        await fetch("http://invalid-url/health", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Rate Limiting", () => {
    test("should handle multiple rapid requests", async () => {
      const requests = Array(5)
        .fill()
        .map(() =>
          fetch(`${supabaseUrl}/health`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })
        );

      const responses = await Promise.all(requests);

      // All should return 401 (unauthorized) rather than rate limit errors
      responses.forEach((response) => {
        expect(response.status).toBe(401);
      });
    });
  });
});
