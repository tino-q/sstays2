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

  describe("updateReservation", () => {
    test("should successfully update a reservation", async () => {
      const updates = { guest_name: "Jane Doe", status: "cancelled" };
      const updatedReservation = { id: "HM4SNC5CAP", ...updates };

      mockSupabase.from().select.mockResolvedValue({
        data: [updatedReservation],
        error: null,
      });

      const result = await reservationService.updateReservation(
        "HM4SNC5CAP",
        updates
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
    });

    test("should handle database errors during update", async () => {
      const updates = { status: "cancelled" };

      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      const result = await reservationService.updateReservation(
        "HM4SNC5CAP",
        updates
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
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

  describe("upsertReservation", () => {
    beforeEach(() => {
      const mockChain = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn(),
      };
      mockSupabase.from = jest.fn().mockReturnValue(mockChain);
    });

    test("should successfully upsert a reservation", async () => {
      const mockReservation = TestDataFactory.createReservation();

      mockSupabase.from().select.mockResolvedValue({
        data: [mockReservation],
        error: null,
      });

      const result = await reservationService.upsertReservation(
        mockReservation
      );

      expect(result).toBe(true);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
    });

    test("should return false on database error", async () => {
      const mockReservation = TestDataFactory.createReservation({
        id: "TEST123",
      });

      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: { message: "Upsert failed" },
      });

      const result = await reservationService.upsertReservation(
        mockReservation
      );

      expect(result).toBe(false);
    });
  });

  describe("getAllReservationsSortedByCheckout", () => {
    test("should successfully retrieve all reservations sorted by checkout", async () => {
      const mockReservations = [
        TestDataFactory.createReservation({
          id: "RES1",
          check_out: "2025-01-15",
        }),
        TestDataFactory.createReservation({
          id: "RES2",
          check_out: "2025-01-10",
        }),
      ];

      const mockOrder = jest.fn() as any;
      mockOrder.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockResolvedValueOnce({
        data: mockReservations,
        error: null,
      });

      const mockChain = {
        select: jest.fn().mockReturnValue({ order: mockOrder }),
        order: mockOrder,
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockChain);

      const result =
        await reservationService.getAllReservationsSortedByCheckout();

      expect(result).toEqual(mockReservations);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
    });

    test("should return empty array on database error", async () => {
      const mockOrder = jest.fn() as any;
      mockOrder.mockReturnValueOnce({ order: mockOrder });
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      const mockChain = {
        select: jest.fn().mockReturnValue({ order: mockOrder }),
        order: mockOrder,
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockChain);

      const result =
        await reservationService.getAllReservationsSortedByCheckout();

      expect(result).toEqual([]);
    });
  });
});
