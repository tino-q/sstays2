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

// Mock TaskService since it's used internally by ReservationService
jest.mock("../../functions/_shared/task-service.ts", () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    createCleaningTaskForReservation: jest.fn(),
  })),
}));

describe("ReservationService", () => {
  let reservationService: ReservationService;
  let mockSupabase: any;

  setupTestEnvironment();

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClientWithChains();
    reservationService = new ReservationService(mockSupabase);
  });

  describe("createReservation", () => {
    test("should successfully create a reservation", async () => {
      const mockReservation = TestDataFactory.createReservation();

      // Mock the full chain: from().upsert().select().single()
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.createReservation(
        mockReservation
      );

      expect(result).toEqual(mockReservation);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "reservations");
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        [mockReservation],
        { onConflict: "id" }
      );
    });

    test("should handle database errors", async () => {
      const mockReservation = TestDataFactory.createReservation({
        id: "TEST123",
      });

      const databaseError = new Error("Database error");

      // Mock the full chain for error case - the implementation throws the error object
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: null,
        error: databaseError,
      });

      await expect(
        reservationService.createReservation(mockReservation)
      ).rejects.toThrow(databaseError);
    });
  });

  describe("reservationExists", () => {
    test("should return true when reservation exists", async () => {
      const mockReservation = TestDataFactory.createReservation();

      // Mock the full chain: from().select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.reservationExists("HM4SNC5CAP");

      expect(result).toBe(true);
      expect(mockSupabase.from().select).toHaveBeenCalledWith("*");
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
        "id",
        "HM4SNC5CAP"
      );
    });

    test("should return false when reservation does not exist", async () => {
      // Mock maybeSingle() returning null data (no error for maybeSingle when no rows found)
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await reservationService.reservationExists("NONEXISTENT");

      expect(result).toBe(false);
    });

    test("should throw error when database error occurs", async () => {
      const databaseError = new Error("Database connection error");

      mockSupabase.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: databaseError,
      });

      await expect(
        reservationService.reservationExists("SOMEID")
      ).rejects.toThrow(databaseError);
    });
  });
});
