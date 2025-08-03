import { describe, test, expect, beforeEach, jest } from "@jest/globals";

// Define proper types for Supabase responses
interface SupabaseUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  user_metadata: Record<string, any>;
}

interface SupabaseAuthResponse {
  data: {
    user: SupabaseUser | null;
  };
  error: {
    message: string;
  } | null;
}

// Mock Supabase client with proper typing
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn<() => Promise<SupabaseAuthResponse>>(),
  },
};

const mockServiceRoleClient = {
  auth: {
    admin: {
      getUserById: jest.fn<() => Promise<SupabaseAuthResponse>>(),
    },
  },
};

// Mock environment service
jest.mock("../../functions/_shared/env-service.ts", () => ({
  envService: {
    get: jest.fn((key: string) => {
      const envVars: Record<string, string> = {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_ANON_KEY: "test-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      };
      return envVars[key];
    }),
  },
}));

// Mock Supabase createClient to return different clients based on the key
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn((url: string, key: string) => {
    // Return service role client for service role key, otherwise return regular client
    if (key === "test-service-role-key") {
      return mockServiceRoleClient;
    }
    return mockSupabaseClient;
  }),
}));

describe("AuthService", () => {
  let authService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import the AuthService class directly to create a new instance
    const { AuthService } = require("../../functions/_shared/auth-service");
    authService = new AuthService();
  });

  describe("verifyToken", () => {
    test("should return success for valid token", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: {
          role: "admin",
          name: "Test User",
        },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.verifyToken("Bearer valid-token");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        role: "admin",
        metadata: {
          role: "admin",
          name: "Test User",
        },
      });
    });

    test("should handle default role when not specified", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: {},
      };

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
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: {
          role: "admin",
          name: "Test User",
        },
      };

      mockServiceRoleClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getUserProfile("user-123");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        role: "admin",
        metadata: {
          role: "admin",
          name: "Test User",
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

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: { role: "user" },
      };

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

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-01T00:00:00Z",
        user_metadata: { role: "admin" },
      };

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
