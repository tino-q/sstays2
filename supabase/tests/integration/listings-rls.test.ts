/**
 * Integration tests for listings table RLS policies
 * Tests that admins have full access, cleaners can only read,
 * unassigned users have no access
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  IntegrationTestHelper,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "./test-utils";

describe("Listings RLS Policy Tests", () => {
  let helper: IntegrationTestHelper;
  let serviceRoleClient: SupabaseClient;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
    serviceRoleClient = helper.serviceRoleClient;
  });

  beforeEach(() => helper.prepareDatabase());

  describe("Unassigned user access", () => {
    test("unassigned user cannot read listings", async () => {
      // Create test listing data using service role
      const testListing = {
        id: "test-property-1",
        airbnb_id: "12345678901234567890", // Large number as string
        airbnb_payload: {
          name: "Test Property",
          description: "A test listing",
          price: 100,
          location: "Test City",
        },
      };

      // Insert test data with service role (bypasses RLS)
      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create unassigned user
      const { user } = await helper.createTestUser({
        testName: "unassigned-read",
        role: "unassigned",
      });

      // Create client with the unassigned user's session
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Try to read listings - should fail due to RLS
      const { data, error } = await userClient.from("listings").select("*");

      // RLS should block access - data should be empty
      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty results, not an error
    });

    test("unassigned user cannot insert listings", async () => {
      // Create unassigned user
      const { user } = await helper.createTestUser({
        testName: "unassigned-insert",
        role: "unassigned",
      });

      // Create client with the unassigned user's session
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      const testListing = {
        id: "test-property-2",
        airbnb_id: "98765432109876543210",
        airbnb_payload: {
          name: "Unauthorized Property",
          description: "Should not be insertable",
          price: 200,
        },
      };

      // Try to insert listing - should fail due to RLS
      const { data, error } = await userClient
        .from("listings")
        .insert(testListing);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501"); // Insufficient privilege error code
    });

    test("unassigned user cannot update listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-3",
        airbnb_id: "11111111111111111111",
        airbnb_payload: {
          name: "Original Property",
          price: 150,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create unassigned user
      const { user } = await helper.createTestUser({
        testName: "unassigned-update",
        role: "unassigned",
      });

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Try to update listing - should fail
      const { data, error } = await userClient
        .from("listings")
        .update({
          airbnb_payload: {
            name: "Updated Property",
            price: 300,
          },
        })
        .eq("id", "test-property-3");

      // RLS blocks update - should return null for data and no error
      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    test("unassigned user cannot delete listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-delete-1",
        airbnb_id: "22222222222222222222",
        airbnb_payload: {
          name: "Delete Test Property",
          price: 100,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create unassigned user
      const { user } = await helper.createTestUser({
        testName: "unassigned-delete",
        role: "unassigned",
      });

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Try to delete listing - should fail
      const { data, error } = await userClient
        .from("listings")
        .delete()
        .eq("id", "test-property-delete-1");

      // RLS blocks delete
      expect(data).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe("Cleaner user access", () => {
    test("cleaner user can read listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-cleaner-1",
        airbnb_id: "33333333333333333333",
        airbnb_payload: {
          name: "Cleaner Readable Property",
          description: "A property cleaners can view",
          price: 120,
          bedrooms: 2,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create cleaner user
      const { user } = await helper.createTestUser({
        testName: "cleaner-read",
        role: "cleaner",
      });

      const cleanerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } =
        await cleanerClient.auth.signInWithPassword({
          email: user.email || "",
          password: "testpassword123",
        });
      expect(signInError).toBeNull();

      // Cleaner should be able to read listings
      const { data, error } = await cleanerClient
        .from("listings")
        .select("*")
        .eq("id", "test-property-cleaner-1");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].airbnb_payload.name).toBe("Cleaner Readable Property");
      expect(data?.[0].airbnb_id).toBe("33333333333333333333");
    });

    test("cleaner user cannot insert listings", async () => {
      // Create cleaner user
      const { user } = await helper.createTestUser({
        testName: "cleaner-insert",
        role: "cleaner",
      });

      const cleanerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } =
        await cleanerClient.auth.signInWithPassword({
          email: user.email || "",
          password: "testpassword123",
        });
      expect(signInError).toBeNull();

      const testListing = {
        id: "test-property-cleaner-2",
        airbnb_id: "44444444444444444444",
        airbnb_payload: {
          name: "Cleaner Attempted Insert",
          price: 180,
        },
      };

      // Cleaner should NOT be able to insert listings
      const { data, error } = await cleanerClient
        .from("listings")
        .insert(testListing);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501"); // Insufficient privilege error code
    });

    test("cleaner user cannot update listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-cleaner-3",
        airbnb_id: "55555555555555555555",
        airbnb_payload: {
          name: "Cleaner Update Test",
          price: 160,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create cleaner user
      const { user } = await helper.createTestUser({
        testName: "cleaner-update",
        role: "cleaner",
      });

      const cleanerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } =
        await cleanerClient.auth.signInWithPassword({
          email: user.email || "",
          password: "testpassword123",
        });
      expect(signInError).toBeNull();

      // Cleaner should NOT be able to update listings
      const { data, error } = await cleanerClient
        .from("listings")
        .update({
          airbnb_payload: {
            name: "Cleaner Updated",
            price: 999,
          },
        })
        .eq("id", "test-property-cleaner-3");

      // RLS blocks update for cleaners
      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    test("cleaner user cannot delete listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-cleaner-delete",
        airbnb_id: "66666666666666666666",
        airbnb_payload: {
          name: "Cleaner Delete Test",
          price: 140,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create cleaner user
      const { user } = await helper.createTestUser({
        testName: "cleaner-delete",
        role: "cleaner",
      });

      const cleanerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } =
        await cleanerClient.auth.signInWithPassword({
          email: user.email || "",
          password: "testpassword123",
        });
      expect(signInError).toBeNull();

      // Cleaner should NOT be able to delete listings
      const { data, error } = await cleanerClient
        .from("listings")
        .delete()
        .eq("id", "test-property-cleaner-delete");

      // RLS blocks delete for cleaners
      expect(data).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe("Admin user access", () => {
    test("admin user can read listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-admin-1",
        airbnb_id: "77777777777777777777",
        airbnb_payload: {
          name: "Admin Readable Property",
          description: "Property for admin testing",
          price: 250,
          bathrooms: 2,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-read",
        role: "admin",
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Admin should be able to read listings
      const { data, error } = await adminClient
        .from("listings")
        .select("*")
        .eq("id", "test-property-admin-1");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].airbnb_payload.name).toBe("Admin Readable Property");
    });

    test("admin user can insert listings", async () => {
      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-insert",
        role: "admin",
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      const testListing = {
        id: "admin-inserted-property",
        airbnb_id: "88888888888888888888",
        airbnb_payload: {
          name: "Admin Inserted Property",
          description: "Property created by admin",
          price: 300,
          capacity: 4,
        },
      };

      // Admin should be able to insert listings
      const { data, error } = await adminClient
        .from("listings")
        .insert(testListing)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].airbnb_payload.name).toBe("Admin Inserted Property");
      expect(data?.[0].airbnb_id).toBe("88888888888888888888");
    });

    test("admin user can update listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-admin-update",
        airbnb_id: "99999999999999999999",
        airbnb_payload: {
          name: "Original Admin Property",
          price: 200,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-update",
        role: "admin",
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Admin should be able to update listings
      const { data, error } = await adminClient
        .from("listings")
        .update({
          airbnb_payload: {
            name: "Updated by Admin",
            price: 350,
            updated: true,
          },
        })
        .eq("id", "test-property-admin-update")
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].airbnb_payload.name).toBe("Updated by Admin");
      expect(data?.[0].airbnb_payload.price).toBe(350);
    });

    test("admin user can delete listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-admin-delete",
        airbnb_id: "10101010101010101010",
        airbnb_payload: {
          name: "Admin Delete Test",
          price: 180,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create admin user
      const { user } = await helper.createTestUser({
        testName: "admin-delete",
        role: "admin",
      });

      const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email || "",
        password: "testpassword123",
      });
      expect(signInError).toBeNull();

      // Admin should be able to delete listings
      const { data, error } = await adminClient
        .from("listings")
        .delete()
        .eq("id", "test-property-admin-delete")
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].id).toBe("test-property-admin-delete");

      // Verify deletion by trying to read
      const { data: verifyData } = await serviceRoleClient
        .from("listings")
        .select("*")
        .eq("id", "test-property-admin-delete");

      expect(verifyData).toHaveLength(0);
    });
  });

  describe("Unauthenticated access", () => {
    test("unauthenticated user cannot read listings", async () => {
      // Create test listing with service role
      const testListing = {
        id: "test-property-unauth",
        airbnb_id: "20202020202020202020",
        airbnb_payload: {
          name: "Unauthenticated Test Property",
          price: 100,
        },
      };

      const { error: insertError } = await serviceRoleClient
        .from("listings")
        .insert(testListing);
      expect(insertError).toBeNull();

      // Create unauthenticated client
      const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Try to read listings without authentication
      const { data, error } = await unauthClient.from("listings").select("*");

      // RLS blocks access - returns empty array
      expect(data).toEqual([]);
    });

    test("unauthenticated user cannot insert listings", async () => {
      const unauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const testListing = {
        id: "unauthorized-property",
        airbnb_id: "30303030303030303030",
        airbnb_payload: {
          name: "Unauthorized Property",
          price: 150,
        },
      };

      // Try to insert without authentication - should fail
      const { data, error } = await unauthClient
        .from("listings")
        .insert(testListing);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      // Permission denied under PostgREST returns 42501
      expect(error?.code).toBe("42501");
    });
  });
});
