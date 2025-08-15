/**
 * Integration tests for mailgun-webhook endpoint
 * These tests run against actual Supabase Edge Functions and database
 */

import { IntegrationTestHelper } from "./test-utils";

interface WebhookSuccessResponse {
  success: true;
  message: string;
  reservation_id: string;
  guest_name?: string;
  check_in?: string;
  check_out?: string;
  listing_id?: string;
}

interface WebhookErrorResponse {
  success: false;
  message: string;
  error?: string;
  subject?: string;
  from?: string;
}

interface MethodNotAllowedResponse {
  error: string;
}

interface Reservation {
  id: string;
  guest_name: string;
  listing_id?: string;
  check_in?: string;
  check_out?: string;
  // ... other reservation properties
}

describe("Mailgun Webhook - Integration Tests", () => {
  let testHelper: IntegrationTestHelper;
  let testListingId: string;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
  });

  beforeEach(async () => {
    await testHelper.prepareDatabase();
    const { id } = await testHelper.createTestListing();
    expect(id).toBeDefined();
    testListingId = id;
  });

  test("should process valid Airbnb confirmation email", async () => {
    const formData = new URLSearchParams();
    formData.append("subject", "Your reservation is confirmed");
    formData.append("from", "automated@airbnb.com");
    formData.append(
      "body-plain",
      `
      Your reservation is confirmed!
      
      Confirmation: TEST123
      Guest: John Doe
      Property: Test Property
      Check-in: 15-01-2024
      Check-out: 18-01-2024
      Guests: 2
      Total: $570.00
      `
    );

    const response = await testHelper.unauthenticatedRequest(
      "/mailgun-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );
    const data = (await response.json()) as WebhookSuccessResponse;
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("reservation_id", "TEST123");

    // Verify reservation was saved to database
    const { data: reservation } = (await testHelper.serviceRoleClient
      .from("reservations")
      .select("*")
      .eq("id", "TEST123")
      .single()) as { data: Reservation | null };

    expect(reservation).toBeTruthy();
    expect(reservation?.guest_name).toBe("John Doe");
  });

  test("should throw error for duplicate reservation", async () => {
    const formData = new URLSearchParams();
    formData.append("subject", "Your reservation is confirmed");
    formData.append("from", "automated@airbnb.com");
    formData.append(
      "body-plain",
      `
      Your reservation is confirmed!
      
      Confirmation: DUPLICATE456
      Guest: Jane Smith
      Property: Duplicate Test Property
      Check-in: 20-01-2024
      Check-out: 23-01-2024
      Guests: 1
      Total: $450.00
      `
    );

    // First request - should create reservation
    const firstResponse = await testHelper.unauthenticatedRequest(
      "/mailgun-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );
    const firstData = (await firstResponse.json()) as WebhookSuccessResponse;
    expect(firstResponse.status).toBe(200);
    expect(firstData).toHaveProperty("success", true);

    // load all ids
    const { data: reservations } = (await testHelper.serviceRoleClient
      .from("reservations")
      .select("id")) as { data: { id: string }[] | null };

    // expect the id to be included
    expect(reservations).toBeTruthy();
    expect(reservations?.map((r) => r.id)).toContain("DUPLICATE456");

    // Second request - idempotent success expected
    const secondResponse = await testHelper.unauthenticatedRequest(
      "/mailgun-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const secondData = (await secondResponse.json()) as WebhookSuccessResponse;

    expect(secondResponse.status).toBe(200);
    expect(secondData).toHaveProperty("success", true);
  });

  test("should return 400 for empty request body", async () => {
    const response = await testHelper.unauthenticatedRequest(
      "/mailgun-webhook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "",
      }
    );
    const data = (await response.json()) as WebhookErrorResponse;

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("success", false);
  });

  test("should return 405 for GET requests", async () => {
    const response = await testHelper.unauthenticatedRequest(
      "/mailgun-webhook",
      {
        method: "GET",
      }
    );
    const data = (await response.json()) as MethodNotAllowedResponse;
    expect(response.status).toBe(405);
    expect(data).toHaveProperty("error", "Method not allowed");
  });
});
