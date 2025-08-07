/**
 * Integration tests for mailgun-webhook endpoint
 * These tests run against actual Supabase Edge Functions and database
 */

const {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} = require("@jest/globals");

const { IntegrationTestHelper } = require("./test-utils");

describe("Mailgun Webhook - Integration Tests", () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
    await testHelper.initializeClients();
    
    // Set NODE_ENV to integration for mock OpenAI
    process.env.NODE_ENV = "integration";
  });

  beforeEach(async () => {
    await testHelper.cleanTestData("reservations", "");
  });

  afterAll(async () => {
    await testHelper.cleanTestData("reservations", "");
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

    const response = await testHelper.unauthenticatedRequest("/mailgun-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("reservation_id", "TEST123");

    // Verify reservation was saved to database
    const { data: reservation } = await testHelper.serviceRoleClient
      .from("reservations")
      .select("*")
      .eq("id", "TEST123")
      .single();

    expect(reservation).toBeTruthy();
    expect(reservation.guest_name).toBe("John Doe");
  });

  test("should handle duplicate reservation properly", async () => {
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
    const firstResponse = await testHelper.unauthenticatedRequest("/mailgun-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData).toHaveProperty("success", true);

    // load all ids
    const { data: reservations } = await testHelper.serviceRoleClient
      .from("reservations")
      .select("id");

    // expect the id to be included

    expect(reservations.map((r) => r.id)).toContain("DUPLICATE456");

    // Second request - should detect duplicate
    const secondResponse = await testHelper.unauthenticatedRequest("/mailgun-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const secondData = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondData).toHaveProperty("success", true);
    expect(secondData).toHaveProperty("message", "Reservation already exists");
  });

  test("should return 400 for empty request body", async () => {
    const response = await testHelper.unauthenticatedRequest("/mailgun-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("success", false);
  });

  test("should return 405 for GET requests", async () => {
    const response = await testHelper.unauthenticatedRequest("/mailgun-webhook", {
      method: "GET",
    });
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data).toHaveProperty("error", "Method not allowed");
  });
});
