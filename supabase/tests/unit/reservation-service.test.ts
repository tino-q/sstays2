import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { ReservationService } from "../../functions/_shared/reservation-service.ts";

describe("ReservationService", () => {
  let reservationService: any;
  let mockSupabase: any;

  beforeEach(async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    
    mockSupabase = {
      from: jest.fn().mockReturnValue(mockChain),
    };
    
    reservationService = new ReservationService(mockSupabase);
  });

  describe("createReservation", () => {
    test("should successfully create a reservation", async () => {
      const mockReservation = {
        id: "HM4SNC5CAP",
        guest_name: "John Doe",
        status: "confirmed",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSupabase.from().select.mockResolvedValue({
        data: [mockReservation],
        error: null,
      });

      const result = await reservationService.createReservation(
        mockReservation
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.from().insert).toHaveBeenCalledWith([mockReservation]);
    });

    test("should handle database errors", async () => {
      const mockReservation = { id: "TEST123", guest_name: "Test" };

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
      const mockReservation = {
        id: "HM4SNC5CAP",
        guest_name: "John Doe",
        status: "confirmed",
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.getReservation("HM4SNC5CAP");

      expect(result).toEqual(mockReservation);
      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.from().select).toHaveBeenCalledWith("*");
      expect(mockSupabase.from().eq).toHaveBeenCalledWith("id", "HM4SNC5CAP");
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

      mockSupabase.from().select.mockResolvedValue({
        data: [{ id: "HM4SNC5CAP", ...updates }],
        error: null,
      });

      const result = await reservationService.updateReservation("HM4SNC5CAP", updates);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockSupabase.from).toHaveBeenCalledWith("reservations");
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(Date),
      });
      expect(mockSupabase.from().eq).toHaveBeenCalledWith("id", "HM4SNC5CAP");
    });

    test("should handle database errors during update", async () => {
      const updates = { status: "cancelled" };

      mockSupabase.from().select.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      const result = await reservationService.updateReservation("HM4SNC5CAP", updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("reservationExists", () => {
    test("should return true when reservation exists", async () => {
      const mockReservation = { id: "HM4SNC5CAP", guest_name: "John Doe" };

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
