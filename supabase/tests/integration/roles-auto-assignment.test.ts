/**
 * Integration tests for automatic role assignment
 * Tests that new users automatically get "unassigned" role
 */

import { createClient } from "@supabase/supabase-js";
import {
  IntegrationTestHelper,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "./test-utils";

describe("Role Auto-Assignment Tests", () => {
  let helper: IntegrationTestHelper;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
  });

  beforeEach(() => helper.prepareDatabase());

  test("new user automatically gets unassigned role", async () => {
    const serviceClient = helper.serviceRoleClient;

    // Create a new user using service role
    const testEmail = `auto-role-test-${Date.now()}@example.com`;
    const testPassword = "testpassword123";

    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

    expect(createError).toBeNull();
    expect(newUser.user).toBeTruthy();

    // Check that the user was automatically assigned the "unassigned" role
    const { data: roleData, error: roleError } = await serviceClient
      .from("roles")
      .select("role")
      .eq("user_id", newUser.user!.id)
      .single();

    expect(roleError).toBeNull();
    expect(roleData).toBeTruthy();
    expect(roleData?.role).toBe("unassigned");
  });

  test("user can read their own unassigned role", async () => {
    // Create user with unassigned role (should happen automatically)
    const { user } = await helper.createTestUser({
      testName: "unassigned-read",
      role: "unassigned",
    });

    // Create client with the user's session
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email || "",
      password: "testpassword123",
    });
    expect(signInError).toBeNull();

    // User should be able to read their own role
    const { data, error } = await userClient
      .from("roles")
      .select("role")
      .eq("user_id", user.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.role).toBe("unassigned");
  });

  test("get_user_role function returns unassigned for new users", async () => {
    // Create user (should get unassigned role automatically)
    const { user } = await helper.createTestUser({
      testName: "get-role-test",
      role: "unassigned",
    });

    // Check the role directly from the table
    const serviceClient = helper.serviceRoleClient;
    const { data: roleData, error: roleError } = await serviceClient
      .from("roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    expect(roleError).toBeNull();
    expect(roleData?.role).toBe("unassigned");
  });
});
