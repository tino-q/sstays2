/**
 * Shared utilities for integration tests
 * Reduces boilerplate and standardizes test patterns
 */

const { createClient } = require("@supabase/supabase-js");

// Constants
const FUNCTION_URL = "http://localhost:54321/functions/v1";
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/**
 * Creates a test user with optional admin privileges
 */
class IntegrationTestHelper {
  constructor() {
    this.serviceRoleClient = null;
    this.supabaseClient = null;
    this.testUser = null;
    this.authToken = null;
  }

  /**
   * Initialize Supabase clients
   */
  async initializeClients() {
    this.serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Create a test user with authentication token
   * @param {Object} options - User creation options
   * @param {string} options.testName - Name for the test (used in email)
   * @param {boolean} options.isAdmin - Whether user should have admin privileges
   * @param {Object} options.metadata - Additional user metadata
   */
  async createTestUser(options = {}) {
    const {
      testName = "test",
      isAdmin = false,
      metadata = { role: "user", name: "Test User" }
    } = options;

    const testUser = {
      email: `${testName}-${Date.now()}@example.com`,
      password: "testpassword123",
      user_metadata: metadata,
    };

    try {
      // Create user
      const { data: newUser, error: createError } =
        await this.serviceRoleClient.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          user_metadata: testUser.user_metadata,
          email_confirm: true,
        });

      if (createError) throw createError;
      this.testUser = newUser.user;

      // Add admin privileges if requested
      if (isAdmin) {
        const { error: adminError } = await this.serviceRoleClient
          .from("admin_users")
          .insert([{ user_id: this.testUser.id }]);
        if (adminError) throw adminError;
      }

      // Sign in to get auth token
      const { data: sessionData, error: signInError } =
        await this.supabaseClient.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password,
        });

      if (signInError) throw signInError;
      this.authToken = sessionData.session.access_token;

      console.log(`Test user created: ${this.testUser.email}${isAdmin ? " (admin)" : ""}`);
      return {
        user: this.testUser,
        token: this.authToken,
        email: testUser.email,
      };
    } catch (error) {
      console.error("Test user creation failed:", error);
      throw error;
    }
  }

  /**
   * Clean up test user and associated data
   * @param {Array<string>} tablesToClean - Tables to clean test data from
   * @param {string} testDataPrefix - Prefix used to identify test data (default: "TEST")
   */
  async cleanup(tablesToClean = [], testDataPrefix = "TEST") {
    if (!this.testUser) return;

    try {
      // Clean up test data from specified tables
      for (const table of tablesToClean) {
        await this.serviceRoleClient
          .from(table)
          .delete()
          .like("id", `${testDataPrefix}-%`);
      }

      // Remove from admin_users table if exists
      await this.serviceRoleClient
        .from("admin_users")
        .delete()
        .eq("user_id", this.testUser.id);

      // Delete test user
      await this.serviceRoleClient.auth.admin.deleteUser(this.testUser.id);
      console.log("Test user and data cleaned up");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Make an authenticated request to an endpoint
   * @param {string} endpoint - The endpoint path (e.g., "/health")
   * @param {Object} options - Fetch options
   */
  async authenticatedRequest(endpoint, options = {}) {
    const { headers = {}, ...otherOptions } = options;
    
    return fetch(`${FUNCTION_URL}${endpoint}`, {
      ...otherOptions,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...headers,
      },
    });
  }

  /**
   * Make an unauthenticated request to an endpoint
   * @param {string} endpoint - The endpoint path
   * @param {Object} options - Fetch options
   */
  async unauthenticatedRequest(endpoint, options = {}) {
    return fetch(`${FUNCTION_URL}${endpoint}`, options);
  }

  /**
   * Common test: Check 401 for unauthenticated requests
   */
  async testUnauthenticatedAccess(endpoint, method = "GET") {
    const response = await this.unauthenticatedRequest(endpoint, { method });
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("msg");
    expect(data.msg).toContain("Missing authorization header");
  }

  /**
   * Common test: Check CORS headers
   */
  async testCorsHeaders(endpoint) {
    const response = await this.unauthenticatedRequest(endpoint, { method: "OPTIONS" });
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
  }

  /**
   * Common test: Check method not allowed
   */
  async testMethodNotAllowed(endpoint, unsupportedMethod = "DELETE") {
    const response = await this.authenticatedRequest(endpoint, { method: unsupportedMethod });
    const data = await response.json();
    
    expect(response.status).toBe(405);
    expect(data).toHaveProperty("error", "Method not allowed");
  }

  /**
   * Clean up test data from a table before each test
   * @param {string} table - Table name
   * @param {string} testDataPrefix - Prefix to identify test data
   */
  async cleanTestData(table, testDataPrefix = "TEST") {
    await this.serviceRoleClient
      .from(table)
      .delete()
      .like("id", `${testDataPrefix}-%`);
  }
}

module.exports = {
  IntegrationTestHelper,
  FUNCTION_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
};