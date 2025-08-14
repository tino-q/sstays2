/**
 * Shared utilities for integration tests
 * Reduces boilerplate and standardizes test patterns
 */

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

// Constants
export const FUNCTION_URL = "http://localhost:54321/functions/v1";
export const SUPABASE_URL =
  process.env.SUPABASE_URL || "http://127.0.0.1:54321";
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
  private _supabaseAnonClient: SupabaseClient | null = null;
  private testUser: User | null = null;
  private testAdminUser: User | null = null;
  private authToken: string | null = null;

  public constructor() {
    this._serviceRoleClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );
    this._supabaseAnonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Get the service role client - guaranteed to be non-null after initialization
   */
  public get serviceRoleClient(): SupabaseClient {
    if (!this._serviceRoleClient) {
      throw new Error(
        "Service role client not initialized. Call initializeClients() first."
      );
    }
    return this._serviceRoleClient;
  }

  /**
   * Get the regular supabase client - guaranteed to be non-null after initialization
   */
  public get supabaseAnonClient(): SupabaseClient {
    if (!this._supabaseAnonClient) {
      throw new Error(
        "Supabase client not initialized. Call initializeClients() first."
      );
    }
    return this._supabaseAnonClient;
  }

  /**
   * Create a test user with authentication token
   */
  public async createTestUser(
    options: CreateTestUserOptions = {}
  ): Promise<TestUser> {
    try {
      // Using getters ensures clients are initialized
      const serviceClient = this.serviceRoleClient;
      const regularClient = this.supabaseAnonClient;

      const {
        testName = "test",
        isAdmin = false,
        metadata = { role: "user", name: "Test User" },
      } = options;

      const testUser = {
        email: `${testName}-${Date.now()}@example.com`,
        password: "testpassword123",
        user_metadata: metadata,
      };

      // Create user
      const { data: newUser, error: createError } =
        await serviceClient.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          user_metadata: testUser.user_metadata,
          email_confirm: true,
        });

      if (createError) throw createError;
      if (!newUser.user) throw new Error("User creation failed");

      // Add admin privileges if requested
      if (isAdmin) {
        const { error: adminError } = await serviceClient
          .from("admin_users")
          .insert([{ user_id: newUser.user.id }]);
        if (adminError) throw adminError;
      }

      // Sign in to get auth token
      const { data: sessionData, error: signInError } =
        await regularClient.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password,
        });

      if (signInError) throw signInError;
      if (!sessionData.session) throw new Error("Sign in failed");

      this.authToken = sessionData.session.access_token;

      return {
        user: newUser.user,
        token: this.authToken,
        email: testUser.email,
      };
    } catch (error) {
      console.error("Error creating test user", error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to an endpoint
   */
  public async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.authToken) {
      throw new Error("No auth token available. Create a test user first.");
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
  public async unauthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(`${FUNCTION_URL}${endpoint}`, options);
  }

  /**
   * Clean up test data from a table before each test
   */
  private async cleanTestData(table: string): Promise<void> {
    await this.serviceRoleClient.from(table).delete().not("id", "is", null);
  }

  private async deleteAllAuthUsers(): Promise<void> {
    // 1. List users (1000 max per page)
    let page = 1;
    let deletedCount = 0;

    while (true) {
      const { data, error } = await this.serviceRoleClient.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        }
      );
      if (error) throw error;
      if (!data.users.length) break;

      // 2. Delete each user
      for (const user of data.users) {
        const { error: delErr } =
          await this.serviceRoleClient.auth.admin.deleteUser(user.id);
        if (delErr) throw delErr;
        deletedCount++;
      }

      page++;
    }
  }

  /**
   * Clean up all test data from the database before each test
   */
  public async cleanDatabase(): Promise<void> {
    await this.cleanTestData("reservations");
    await this.cleanTestData("tasks");
    await this.cleanTestData("admin_users");
    await this.deleteAllAuthUsers();
    const { user: testAdminUser } = await this.createTestUser({
      isAdmin: true,
    });
    this.testAdminUser = testAdminUser;
    const { user: testUser } = await this.createTestUser({ isAdmin: false });
    this.testUser = testUser;
  }
}
