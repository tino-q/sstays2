/**
 * Integration tests for reservations table RLS policies
 * Tests that non-admin users cannot access reservation data
 * and that admin users can access reservation data
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IntegrationTestHelper, SUPABASE_URL, SUPABASE_ANON_KEY } from "./test-utils";

describe("Reservations RLS Policy Tests", () => {
  let helper: IntegrationTestHelper;
  let serviceRoleClient: SupabaseClient;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
    await helper.initializeClients();
    serviceRoleClient = helper.serviceRoleClient;
  });

  beforeEach(async () => {
    // Clean up any existing test reservations
    await helper.cleanTestData("reservations", "TEST");
  });

  afterEach(async () => {
    await helper.cleanup(["reservations"], "TEST");
  });

  describe("Non-admin user access", () => {
    test("authenticated non-admin user cannot read reservations", async () => {
      // Create test reservation data using service role
      const testReservation = {
        id: "TEST-RESERVATION-1",
        guest_name: "Test Guest",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Test Property"
      };

      // Insert test data with service role (bypasses RLS)
      const { error: insertError } = await serviceRoleClient
        .from("reservations")
        .insert(testReservation);
      expect(insertError).toBeNull();

      // Create regular (non-admin) user
      const { user } = await helper.createTestUser({
        testName: "nonadmin-read",
        isAdmin: false
      });

      // Create client with the non-admin user's session
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || '',
        password: "testpassword123"
      });
      expect(signInError).toBeNull();

      // Try to read reservations - should fail due to RLS
      const { data, error } = await userClient
        .from("reservations")
        .select("*");

      // RLS should block access - data should be empty
      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty results, not an error
    });

    test("authenticated non-admin user cannot insert reservations", async () => {
      // Create regular (non-admin) user
      const { user } = await helper.createTestUser({
        testName: "nonadmin-insert",
        isAdmin: false
      });

      // Create client with the non-admin user's session
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || '',
        password: "testpassword123"
      });
      expect(signInError).toBeNull();

      const testReservation = {
        id: "TEST-RESERVATION-2",
        guest_name: "Test Guest 2",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Test Property 2"
      };

      // Try to insert reservation - should fail due to RLS
      const { data, error } = await userClient
        .from("reservations")
        .insert(testReservation);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501"); // Insufficient privilege error code
    });

    test("authenticated non-admin user cannot update reservations", async () => {
      // Create test reservation with service role
      const testReservation = {
        id: "TEST-RESERVATION-3",
        guest_name: "Test Guest",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Test Property"
      };

      const { error: insertError } = await serviceRoleClient
        .from("reservations")
        .insert(testReservation);
      expect(insertError).toBeNull();

      // Create regular (non-admin) user
      const { user } = await helper.createTestUser({
        testName: "nonadmin-update",
        isAdmin: false
      });

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || '',
        password: "testpassword123"
      });
      expect(signInError).toBeNull();

      // Try to update reservation - should fail
      const { data, error } = await userClient
        .from("reservations")
        .update({ guest_name: "Updated Guest" })
        .eq("id", "TEST-RESERVATION-3");

      // RLS blocks update - should return null for data and no error
      expect(data).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe("Admin user access", () => {
    test("admin user can read reservations", async () => {
      // Create test reservation with service role
      const testReservation = {
        id: "TEST-RESERVATION-4",
        guest_name: "Test Guest Admin",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Test Property Admin"
      };

      const { error: insertError } = await serviceRoleClient
        .from("reservations")
        .insert(testReservation);
      expect(insertError).toBeNull();

      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-read",
        isAdmin: true
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || '',
        password: "testpassword123"
      });
      expect(signInError).toBeNull();

      // Admin should be able to read reservations
      const { data, error } = await adminClient
        .from("reservations")
        .select("*")
        .eq("id", "TEST-RESERVATION-4");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].guest_name).toBe("Test Guest Admin");
    });

    test("admin user can insert reservations", async () => {
      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-insert",
        isAdmin: true
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || '',
        password: "testpassword123"
      });
      expect(signInError).toBeNull();

      const testReservation = {
        id: "TEST-RESERVATION-5",
        guest_name: "Admin Inserted Guest",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Admin Test Property"
      };

      // Admin should be able to insert reservations
      const { data, error } = await adminClient
        .from("reservations")
        .insert(testReservation)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].guest_name).toBe("Admin Inserted Guest");
    });
  });

  describe("Unauthenticated access", () => {
    test("unauthenticated user cannot read reservations", async () => {
      // Create test reservation with service role
      const testReservation = {
        id: "TEST-RESERVATION-6",
        guest_name: "Test Guest Unauth",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Test Property Unauth"
      };

      const { error: insertError } = await serviceRoleClient
        .from("reservations")
        .insert(testReservation);
      expect(insertError).toBeNull();

      // Create unauthenticated client
      const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Try to read reservations without authentication
      const { data, error } = await unauthClient
        .from("reservations")
        .select("*");

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty results for unauthenticated users
    });

    test("unauthenticated user cannot insert reservations", async () => {
      const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const testReservation = {
        id: "TEST-RESERVATION-7",
        guest_name: "Unauthorized Guest",
        check_in: new Date().toISOString(),
        check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        property_name: "Unauthorized Property"
      };

      // Try to insert without authentication - should fail
      const { data, error } = await unauthClient
        .from("reservations")
        .insert(testReservation);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501"); // Insufficient privilege error code
    });
  });
});