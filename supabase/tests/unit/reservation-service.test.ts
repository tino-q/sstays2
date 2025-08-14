import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { ReservationService } from "../../functions/_shared/reservation-service";
import {
  createMockSupabaseClientWithChains,
  TestDataFactory,
  ErrorResponseFactory,
  setupTestEnvironment,
  AssertionHelpers,
  MockHelpers,
} from "./test-utils";

describe("ReservationService", () => {
  let reservationService: any;
  let mockSupabase: any;

  setupTestEnvironment();

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClientWithChains();
    reservationService = new ReservationService(mockSupabase);
  });

  describe("createReservation", () => {
    test("should successfully create a reservation", async () => {
      const mockReservation = TestDataFactory.createReservation();

      mockSupabase.from().select.mockResolvedValue({
        data: [mockReservation],
        error: null,
      });

      const result = await reservationService.createReservation(
        mockReservation
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
    });

    test("should handle database errors", async () => {
      const mockReservation = TestDataFactory.createReservation({
        id: "TEST123",
      });

      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await reservationService.createReservation(
        mockReservation
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getReservation", () => {
    test("should successfully retrieve a reservation", async () => {
      const mockReservation = TestDataFactory.createReservation();

      mockSupabase.from().single.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.getReservation("HM4SNC5CAP");

      expect(result).toEqual(mockReservation);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
    });

    test("should return null when reservation not found", async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await reservationService.getReservation("NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("reservationExists", () => {
    test("should return true when reservation exists", async () => {
      const mockReservation = TestDataFactory.createReservation();

      mockSupabase.from().single.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.reservationExists("HM4SNC5CAP");

      expect(result).toBe(true);
    });

    test("should return false when reservation does not exist", async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await reservationService.reservationExists("NONEXISTENT");

      expect(result).toBe(false);
    });
  });
});
