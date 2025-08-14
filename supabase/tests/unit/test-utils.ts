/**
 * Shared utilities for unit tests
 * Reduces boilerplate and standardizes test patterns
 */

import { jest, beforeEach, afterEach, expect } from "@jest/globals";

// Common Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

export interface SupabaseUser {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  user_metadata: Record<string, any>;
}

export interface SupabaseAuthResponse {
  data: {
    user: SupabaseUser | null;
  };
  error: {
    message: string;
  } | null;
}

// Common error codes
export const ERROR_CODES = {
  NO_ROWS_FOUND: "PGRST116",
  PERMISSION_DENIED: "42501",
  UNIQUE_VIOLATION: "23505",
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  NO_ROWS_FOUND: "No rows found",
  DATABASE_ERROR: "Database error",
  NETWORK_ERROR: "Network error",
  PERMISSION_DENIED: "Permission denied",
} as const;

/**
 * Creates a mock Supabase client with chainable methods
 */
export function createMockSupabaseClient() {
  const mockSingle = jest.fn() as jest.MockedFunction<
    () => Promise<SupabaseResponse<any>>
  >;
  const mockEq = jest.fn(() => ({ single: mockSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    from: mockFrom,
    auth: {
      getUser: jest.fn<() => Promise<SupabaseAuthResponse>>(),
    },
  } as any;
}

/**
 * Creates a mock Supabase client with more complex chainable methods
 * for services that need insert, update, upsert, etc.
 */
export function createMockSupabaseClientWithChains() {
  const mockChain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    order: jest.fn().mockReturnThis(),
  };

  return {
    from: jest.fn().mockReturnValue(mockChain),
  } as any;
}

/**
 * Creates a mock environment service
 */
export function createMockEnvService(envVars: Record<string, string> = {}) {
  const defaultEnvVars: Record<string, string> = {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    OPENAI_API_KEY: "test-openai-key",
    NODE_ENV: "test",
    ...envVars,
  };

  return {
    get: jest.fn((key: string) => defaultEnvVars[key]),
  };
}

/**
 * Creates a mock OpenAI client
 */
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };
}

/**
 * Creates a mock service role client for auth operations
 */
export function createMockServiceRoleClient() {
  return {
    auth: {
      admin: {
        getUserById: jest.fn<() => Promise<SupabaseAuthResponse>>(),
        createUser: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  };
}

/**
 * Common test data factories
 */
export const TestDataFactory = {
  createAdminUser: (overrides: Partial<SupabaseUser> = {}) => ({
    id: "admin-123",
    email: "admin@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    user_metadata: { role: "admin", name: "Admin User" },
    ...overrides,
  }),

  createRegularUser: (overrides: Partial<SupabaseUser> = {}) => ({
    id: "user-123",
    email: "user@example.com",
    email_confirmed_at: "2024-01-01T00:00:00Z",
    user_metadata: { role: "user", name: "Regular User" },
    ...overrides,
  }),

  createReservation: (overrides: any = {}) => ({
    id: "HM4SNC5CAP",
    property_id: "123",
    property_name: "Test Property",
    guest_name: "John Doe",
    status: "confirmed",
    check_in: new Date("2025-08-20"),
    check_out: new Date("2025-08-22"),
    nights: 2,
    party_size: 2,
    pricing_guest_total: 200,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),
};

/**
 * Common error response helpers
 */
export const ErrorResponseFactory = {
  noRowsFound: () => ({
    data: null,
    error: {
      code: ERROR_CODES.NO_ROWS_FOUND,
      message: ERROR_MESSAGES.NO_ROWS_FOUND,
    },
  }),

  databaseError: (message = ERROR_MESSAGES.DATABASE_ERROR) => ({
    data: null,
    error: { code: ERROR_CODES.PERMISSION_DENIED, message },
  }),

  networkError: () => {
    throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
  },
};

/**
 * Common test setup helper
 */
export function setupTestEnvironment() {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
}

/**
 * Common assertion helpers
 */
export const AssertionHelpers = {
  expectSuccessfulResponse: (result: any, expectedData?: any) => {
    expect(result.success).toBe(true);
    if (expectedData) {
      expect(result.data || result).toEqual(expectedData);
    }
  },

  expectErrorResponse: (result: any, expectedError?: string) => {
    expect(result.success).toBe(false);
    if (expectedError) {
      expect(result.error).toBe(expectedError);
    }
  },

  expectSupabaseCall: (mockFrom: any, tableName: string) => {
    expect(mockFrom).toHaveBeenCalledWith(tableName);
  },
};

/**
 * Common mock setup helpers
 */
export const MockHelpers = {
  setupSuccessfulSupabaseResponse: (mockSingle: any, data: any) => {
    mockSingle.mockResolvedValue({
      data,
      error: null,
    });
  },

  setupErrorSupabaseResponse: (mockSingle: any, error: any) => {
    mockSingle.mockResolvedValue({
      data: null,
      error,
    });
  },

  setupNetworkError: (mockSingle: any) => {
    mockSingle.mockRejectedValue(new Error(ERROR_MESSAGES.NETWORK_ERROR));
  },
};

/**
 * Jest mock setup for common modules
 */
export const MockModules = {
  envService: () => ({
    envService: createMockEnvService(),
  }),

  supabaseClient: () => ({
    createClient: jest.fn((url: string, key: string) => {
      if (key === "test-service-role-key") {
        return createMockServiceRoleClient();
      }
      return createMockSupabaseClient();
    }),
  }),
};

/**
 * Common test patterns
 */
export const TestPatterns = {
  /**
   * Test pattern for successful database operations
   */
  testSuccessfulOperation: (
    operation: () => Promise<any>,
    mockSetup: () => void,
    expectedData: any,
    expectedCalls: Array<{ method: string; args: any[] }> = []
  ) => {
    return async () => {
      mockSetup();
      const result = await operation();
      AssertionHelpers.expectSuccessfulResponse(result, expectedData);

      expectedCalls.forEach(({ method, args }) => {
        expect(method).toHaveBeenCalledWith(...args);
      });
    };
  },

  /**
   * Test pattern for database errors
   */
  testDatabaseError: (
    operation: () => Promise<any>,
    mockSetup: () => void,
    expectedError?: string
  ) => {
    return async () => {
      mockSetup();
      const result = await operation();
      AssertionHelpers.expectErrorResponse(result, expectedError);
    };
  },

  /**
   * Test pattern for network errors
   */
  testNetworkError: (operation: () => Promise<any>, mockSetup: () => void) => {
    return async () => {
      mockSetup();
      const result = await operation();
      AssertionHelpers.expectErrorResponse(result);
    };
  },
};
