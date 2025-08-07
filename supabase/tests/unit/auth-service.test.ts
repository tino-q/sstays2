import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  TestDataFactory,
  setupTestEnvironment,
  MockModules,
} from "./test-utils";

// Mock environment service
jest.mock("../../functions/_shared/env-service.ts", () =>
  MockModules.envService()
);

// Mock Supabase createClient to return different clients based on the key
jest.mock("@supabase/supabase-js", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
  };

  const mockServiceRoleClient = {
    auth: {
      admin: {
        getUserById: jest.fn(),
      },
    },
  };

  return {
    createClient: jest.fn((url: string, key: string) => {
      // Return service role client for service role key, otherwise return regular client
      if (key === "test-service-role-key") {
        return mockServiceRoleClient;
      }
      return mockSupabaseClient;
    }),
  };
});

describe("AuthService", () => {
  let authService: any;
  let mockSupabaseClient: any;
  let mockServiceRoleClient: any;

  setupTestEnvironment();

  beforeEach(() => {
    // Import the AuthService class directly to create a new instance
    const { AuthService } = require("../../functions/_shared/auth-service");
    authService = new AuthService();

    // Get the mocked clients
    const { createClient } = require("@supabase/supabase-js");
    mockSupabaseClient = createClient(
      "https://test.supabase.co",
      "test-anon-key"
    );
    mockServiceRoleClient = createClient(
      "https://test.supabase.co",
      "test-service-role-key"
    );
  });

  describe("verifyToken", () => {
    test("should return success for valid token", async () => {
      const mockUser = TestDataFactory.createAdminUser();

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.verifyToken("Bearer valid-token");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: "admin-123",
        email: "admin@example.com",
        role: "admin",
        metadata: {
          role: "admin",
          name: "Admin User",
        },
      });
    });

    test("should handle default role when not specified", async () => {
      const mockUser = TestDataFactory.createRegularUser();

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.verifyToken("Bearer valid-token");

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe("user");
    });
  });

  describe("getUserProfile", () => {
    test("should return user profile successfully", async () => {
      const mockUser = TestDataFactory.createAdminUser();

      mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getUserProfile("user-123");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: "admin-123",
        email: "admin@example.com",
        role: "admin",
        metadata: {
          role: "admin",
          name: "Admin User",
        },
      });
    });
  });

  describe("hasRequiredRole", () => {
    test("should return true for matching role", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        role: "admin",
      };

      expect(authService.hasRequiredRole(user, "admin")).toBe(true);
    });

    test("should return true for admin role regardless of required role", () => {
      const user = {
        id: "user-123",
        email: "test@example.com",
        role: "admin",
      };

      expect(authService.hasRequiredRole(user, "user")).toBe(true);
      expect(authService.hasRequiredRole(user, "moderator")).toBe(true);
    });
  });

  describe("createAuthMiddleware", () => {
    test("should create middleware that requires authentication", async () => {
      const middleware = authService.createAuthMiddleware();

      const mockUser = TestDataFactory.createRegularUser();

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as any;

      const result = await middleware(mockRequest);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    test("should create middleware that checks role requirements", async () => {
      const middleware = authService.createAuthMiddleware("admin");

      const mockUser = TestDataFactory.createAdminUser();

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue("Bearer valid-token"),
        },
      } as any;

      const result = await middleware(mockRequest);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
  });

  describe("logAuthEvent", () => {
    test("should log authentication event", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await authService.logAuthEvent("user-123", "login", { ip: "127.0.0.1" });

      expect(consoleSpy).toHaveBeenCalledWith("Auth Event: login", {
        userId: "user-123",
        timestamp: expect.any(String),
        details: { ip: "127.0.0.1" },
      });

      consoleSpy.mockRestore();
    });
  });
});
