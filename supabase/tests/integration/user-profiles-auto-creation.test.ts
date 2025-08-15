/**
 * Integration tests for automatic user profile creation
 * Tests that new users automatically get user profiles created
 */

import { createClient } from "@supabase/supabase-js";
import {
  IntegrationTestHelper,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "./test-utils";

describe("User Profile Auto-Creation Tests", () => {
  let helper: IntegrationTestHelper;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
  });

  beforeEach(() => helper.prepareDatabase());

  test("new user automatically gets user profile created", async () => {
    const serviceClient = helper.serviceRoleClient;

    // Create a new user using service role
    const testEmail = `profile-test-${Date.now()}@example.com`;
    const testPassword = "testpassword123";
    const testName = "Test User Profile";

    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          name: testName,
        },
      });

    expect(createError).toBeNull();
    expect(newUser.user).toBeTruthy();

    // Check that the user profile was automatically created
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .eq("id", newUser.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profileData).toBeTruthy();
    expect(profileData?.id).toBe(newUser.user!.id);
    expect(profileData?.email).toBe(testEmail);
    expect(profileData?.name).toBe(testName);
    expect(profileData?.created_at).toBeTruthy();
    expect(profileData?.updated_at).toBeTruthy();
  });

  test("user profile created with email fallback when no name provided", async () => {
    const serviceClient = helper.serviceRoleClient;

    // Create a new user without name in user_metadata
    const testEmail = `no-name-${Date.now()}@example.com`;
    const testPassword = "testpassword123";

    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        // No user_metadata provided
      });

    expect(createError).toBeNull();
    expect(newUser.user).toBeTruthy();

    // Check that the user profile was created with email as name fallback
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .eq("id", newUser.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profileData).toBeTruthy();
    expect(profileData?.id).toBe(newUser.user!.id);
    expect(profileData?.email).toBe(testEmail);
    // Should use the part before @ as name fallback
    expect(profileData?.name).toBe(testEmail.split("@")[0]);
  });

  test("user can read their own profile", async () => {
    // Create user with profile (should happen automatically)
    const { user } = await helper.createTestUser({
      testName: "profile-read-test",
      role: "unassigned",
    });

    // Create client with the user's session
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email || "",
      password: "testpassword123",
    });
    expect(signInError).toBeNull();

    // User should be able to read their own profile
    const { data, error } = await userClient
      .from("user_profiles")
      .select("*")
      .eq("id", user.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(user.id);
    expect(data?.[0]?.email).toBe(user.email);
  });

  test("admin can read all user profiles", async () => {
    // Create a regular user
    const { user: regularUser } = await helper.createTestUser({
      testName: "regular-user",
      role: "unassigned",
    });

    // Create admin user
    const { user: adminUser } = await helper.createTestUser({
      testName: "admin-user",
      role: "admin",
    });

    // Create client with admin user's session
    const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signInError } = await adminClient.auth.signInWithPassword({
      email: adminUser.email || "",
      password: "testpassword123",
    });
    expect(signInError).toBeNull();

    // Admin should be able to read all profiles
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("*")
      .order("created_at");

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThanOrEqual(2); // At least admin and regular user

    // Check that both users' profiles are included
    const userIds = data?.map((profile) => profile.id) || [];
    expect(userIds).toContain(regularUser.id);
    expect(userIds).toContain(adminUser.id);
  });

  test("cleaners hook can join with user profiles", async () => {
    // Create a cleaner user
    const { user: cleanerUser } = await helper.createTestUser({
      testName: "cleaner-user",
      role: "cleaner",
    });

    const serviceClient = helper.serviceRoleClient;

    // Query cleaners and their profiles separately, then join manually
    const { data: cleanerRoles, error: rolesError } = await serviceClient
      .from("roles")
      .select("user_id")
      .eq("role", "cleaner");

    expect(rolesError).toBeNull();
    expect(cleanerRoles).toHaveLength(1);

    const { data: profiles, error: profilesError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .in("id", cleanerRoles?.map((r) => r.user_id) || []);

    expect(profilesError).toBeNull();
    expect(profiles).toHaveLength(1);
    expect(profiles?.[0]?.id).toBe(cleanerUser.id);
    expect(profiles?.[0]?.email).toBe(cleanerUser.email);
    expect(profiles?.[0]?.name).toBeTruthy();
  });
});
