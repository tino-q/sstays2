/**
 * Shared utilities for integration tests
 * Reduces boilerplate and standardizes test patterns
 */

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// Constants
export const FUNCTION_URL = "http://localhost:54321/functions/v1";
export const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

interface TestUser {
  user: User;
  token: string;
  email: string;
}

interface CreateTestUserOptions {
  testName?: string;
  isAdmin?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Creates a test user with optional admin privileges
 */
export class IntegrationTestHelper {
  private _serviceRoleClient: SupabaseClient | null = null;
  private _supabaseClient: SupabaseClient | null = null;
  private testUser: User | null = null;
  private authToken: string | null = null;

  /**
   * Initialize Supabase clients
   */
  async initializeClients(): Promise<void> {
    this._serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this._supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    if (!this._serviceRoleClient || !this._supabaseClient) {
      throw new Error('Failed to initialize Supabase clients');
    }
  }

  /**
   * Get the service role client - guaranteed to be non-null after initialization
   */
  get serviceRoleClient(): SupabaseClient {
    if (!this._serviceRoleClient) {
      throw new Error('Service role client not initialized. Call initializeClients() first.');
    }
    return this._serviceRoleClient;
  }

  /**
   * Get the regular supabase client - guaranteed to be non-null after initialization
   */
  get supabaseClient(): SupabaseClient {
    if (!this._supabaseClient) {
      throw new Error('Supabase client not initialized. Call initializeClients() first.');
    }
    return this._supabaseClient;
  }

  /**
   * Create a test user with authentication token
   */
  async createTestUser(options: CreateTestUserOptions = {}): Promise<TestUser> {
    // Using getters ensures clients are initialized
    const serviceClient = this.serviceRoleClient;
    const regularClient = this.supabaseClient;
    
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
        await serviceClient.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          user_metadata: testUser.user_metadata,
          email_confirm: true,
        });

      if (createError) throw createError;
      if (!newUser.user) throw new Error('User creation failed');
      
      this.testUser = newUser.user;

      // Add admin privileges if requested
      if (isAdmin) {
        const { error: adminError } = await serviceClient
          .from("admin_users")
          .insert([{ user_id: this.testUser.id }]);
        if (adminError) throw adminError;
      }

      // Sign in to get auth token
      const { data: sessionData, error: signInError } =
        await regularClient.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password,
        });

      if (signInError) throw signInError;
      if (!sessionData.session) throw new Error('Sign in failed');
      
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
   */
  async cleanup(tablesToClean: string[] = [], testDataPrefix = "TEST"): Promise<void> {
    if (!this.testUser) return;
    
    const serviceClient = this.serviceRoleClient;

    try {
      // Clean up test data from specified tables
      for (const table of tablesToClean) {
        await serviceClient
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
      await serviceClient.auth.admin.deleteUser(this.testUser.id);
      console.log("Test user and data cleaned up");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Make an authenticated request to an endpoint
   */
  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.authToken) {
      throw new Error('No auth token available. Create a test user first.');
    }
    
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
   */
  async unauthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${FUNCTION_URL}${endpoint}`, options);
  }

  /**
   * Common test: Check 401 for unauthenticated requests
   */
  async testUnauthenticatedAccess(endpoint: string, method = "GET"): Promise<void> {
    const response = await this.unauthenticatedRequest(endpoint, { method });
    const data = await response.json() as { msg: string };
    
    expect(response.status).toBe(401);
    expect(data).toHaveProperty("msg");
    expect(data.msg).toContain("Missing authorization header");
  }

  /**
   * Common test: Check CORS headers
   */
  async testCorsHeaders(endpoint: string): Promise<void> {
    const response = await this.unauthenticatedRequest(endpoint, { method: "OPTIONS" });
    
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("authorization");
  }

  /**
   * Common test: Check method not allowed
   */
  async testMethodNotAllowed(endpoint: string, unsupportedMethod = "DELETE"): Promise<void> {
    const response = await this.authenticatedRequest(endpoint, { method: unsupportedMethod });
    const data = await response.json() as { error: string };
    
    expect(response.status).toBe(405);
    expect(data).toHaveProperty("error", "Method not allowed");
  }

  /**
   * Clean up test data from a table before each test
   */
  async cleanTestData(table: string, testDataPrefix = "TEST"): Promise<void> {
    const serviceClient = this.serviceRoleClient;
    
    await serviceClient
      .from(table)
      .delete()
      .like("id", `${testDataPrefix}-%`);
  }
}