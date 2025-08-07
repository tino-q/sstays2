/**
 * Integration tests for reservations endpoint
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

const TEST_RESERVATION = {
  id: `TEST-${Date.now()}`,
  guest_name: "John Doe", 
  check_in: "2025-08-15T15:00:00Z",
  check_out: "2025-08-20T11:00:00Z",
  status: "confirmed",
  party_size: 2,
  nights: 5,
  property_name: "Test Property",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Reservations Endpoint - Integration Tests", () => {
  let testHelper;

  beforeAll(async () => {
    testHelper = new IntegrationTestHelper();
    await testHelper.initializeClients();
    await testHelper.createTestUser({
      testName: "test-reservations",
      isAdmin: true
    });
  });

  afterAll(async () => {
    await testHelper.cleanup(["reservations"]);
  });

  beforeEach(async () => {
    await testHelper.cleanTestData("reservations");
  });

  describe("GET /reservations", () => {
    test("should return all reservations for authenticated user", async () => {
      const response = await testHelper.authenticatedRequest("/reservations");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    test("should return 401 for unauthenticated requests", async () => {
      await testHelper.testUnauthenticatedAccess("/reservations");
    });
  });

  describe("POST /reservations", () => {
    test("should create reservation with valid data", async () => {
      const response = await testHelper.authenticatedRequest("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation: TEST_RESERVATION,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message", "Reservation created successfully");
      expect(data).toHaveProperty("id", TEST_RESERVATION.id);
    });

    test("should return 400 for missing reservation data", async () => {
      const response = await testHelper.authenticatedRequest("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Bad Request");
      expect(data).toHaveProperty("message", "Missing reservation data");
    });

    test("should return 400 for missing required fields", async () => {
      const incompleteReservation = {
        id: "TEST-INCOMPLETE",
        guest_name: "Jane Doe",
        // missing check_in and check_out
      };

      const response = await testHelper.authenticatedRequest("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation: incompleteReservation,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Bad Request");
      expect(data.message).toContain("Missing required fields");
    });

    test("should return 401 for unauthenticated requests", async () => {
      const response = await testHelper.unauthenticatedRequest("/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservation: TEST_RESERVATION,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("CORS handling", () => {
    test("should handle OPTIONS preflight request", async () => {
      await testHelper.testCorsHeaders("/reservations");
    });
  });

  describe("Method not allowed", () => {
    test("should return 405 for unsupported methods", async () => {
      await testHelper.testMethodNotAllowed("/reservations");
    });
  });
});