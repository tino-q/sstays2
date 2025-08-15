import { describe, test, expect, beforeEach } from "@jest/globals";
import { AdminService } from "../../functions/_shared/admin-service";
import {
  createMockSupabaseClient,
  TestDataFactory,
  ErrorResponseFactory,
  setupTestEnvironment,
  AssertionHelpers,
  MockHelpers,
} from "./test-utils";

describe("AdminService", () => {
  let adminService: AdminService;
  let mockSupabase: any;
  let mockSingle: any;

  setupTestEnvironment();

  beforeEach(() => {
    // Create a proper mock for the double eq chain: from().select().eq().eq().single()
    mockSingle = jest.fn() as jest.MockedFunction<() => Promise<any>>;
    const mockEq2 = jest.fn(() => ({ single: mockSingle }));
    const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
    const mockSelect = jest.fn(() => ({ eq: mockEq1 }));
    const mockFrom = jest.fn(() => ({ select: mockSelect }));
    
    mockSupabase = {
      from: mockFrom,
      auth: {
        getUser: jest.fn(),
      },
    } as any;
    
    adminService = new AdminService(mockSupabase);
  });

  describe("isUserAdmin", () => {
    test("returns true when user is admin", async () => {
      const adminData = TestDataFactory.createAdminUser();
      MockHelpers.setupSuccessfulSupabaseResponse(mockSingle, adminData);

      const result = await adminService.isUserAdmin("admin-123");

      expect(result).toBe(true);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "roles");
    });

    test("returns false when user not found (PGRST116)", async () => {
      MockHelpers.setupErrorSupabaseResponse(
        mockSingle,
        ErrorResponseFactory.noRowsFound().error
      );

      const result = await adminService.isUserAdmin("user-123");

      expect(result).toBe(false);
    });

    test("returns false on database error", async () => {
      MockHelpers.setupErrorSupabaseResponse(
        mockSingle,
        ErrorResponseFactory.databaseError().error
      );

      const result = await adminService.isUserAdmin("user-123");

      expect(result).toBe(false);
    });

    test("returns false when exception thrown", async () => {
      MockHelpers.setupNetworkError(mockSingle);

      const result = await adminService.isUserAdmin("user-123");

      expect(result).toBe(false);
    });
  });

  describe("getAdminUserInfo", () => {
    test("returns admin user info when user exists", async () => {
      const adminData = TestDataFactory.createAdminUser();
      MockHelpers.setupSuccessfulSupabaseResponse(mockSingle, adminData);

      const result = await adminService.getAdminUserInfo("admin-123");

      expect(result).toEqual(adminData);
      AssertionHelpers.expectSupabaseCall(mockSupabase.from, "roles");
    });

    test("returns null when user not found (PGRST116)", async () => {
      MockHelpers.setupErrorSupabaseResponse(
        mockSingle,
        ErrorResponseFactory.noRowsFound().error
      );

      const result = await adminService.getAdminUserInfo("user-123");

      expect(result).toBe(null);
    });

    test("returns null on database error", async () => {
      MockHelpers.setupErrorSupabaseResponse(
        mockSingle,
        ErrorResponseFactory.databaseError().error
      );

      const result = await adminService.getAdminUserInfo("user-123");

      expect(result).toBe(null);
    });

    test("returns null when exception thrown", async () => {
      MockHelpers.setupNetworkError(mockSingle);

      const result = await adminService.getAdminUserInfo("user-123");

      expect(result).toBe(null);
    });
  });
});
