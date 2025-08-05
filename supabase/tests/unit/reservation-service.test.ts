// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// Mock Supabase
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock environment service
jest.mock("../../functions/_shared/env-service.ts", () => ({
  envService: {
    get: jest.fn((key: string) => {
      const envVars: Record<string, string> = {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      };
      return envVars[key];
    }),
  },
}));

describe("ReservationService", () => {
  let ReservationService: any;
  let reservationService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFrom.mockReturnValue({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    });
    
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });

    const module = await import("../../functions/_shared/reservation-service");
    ReservationService = module.ReservationService;
    reservationService = new ReservationService();
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

      mockSelect.mockResolvedValue({
        data: [mockReservation],
        error: null,
      });

      const result = await reservationService.createReservation(mockReservation);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith("reservations");
      expect(mockInsert).toHaveBeenCalledWith([mockReservation]);
    });

    test("should handle database errors", async () => {
      const mockReservation = { id: "TEST123", guest_name: "Test" };

      mockSelect.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await reservationService.createReservation(mockReservation);

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

      mockSingle.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.getReservation("HM4SNC5CAP");

      expect(result).toEqual(mockReservation);
      expect(mockFrom).toHaveBeenCalledWith("reservations");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", "HM4SNC5CAP");
    });

    test("should return null when reservation not found", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await reservationService.getReservation("NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("reservationExists", () => {
    test("should return true when reservation exists", async () => {
      const mockReservation = { id: "HM4SNC5CAP", guest_name: "John Doe" };

      mockSingle.mockResolvedValue({
        data: mockReservation,
        error: null,
      });

      const result = await reservationService.reservationExists("HM4SNC5CAP");

      expect(result).toBe(true);
    });

    test("should return false when reservation does not exist", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await reservationService.reservationExists("NONEXISTENT");

      expect(result).toBe(false);
    });
  });
});