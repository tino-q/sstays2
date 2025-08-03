/**
 * Unit tests for health service business logic
 * These tests mock external dependencies and focus on pure logic
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { HealthService } from "../../functions/_shared/health-service";
import { MockEnvService } from "../../functions/_shared/env-service";

describe("Health Service - Unit Tests", () => {
  let healthService: HealthService;
  let mockSupabaseClient: any;
  let mockEnvService: MockEnvService;

  beforeEach(() => {
    // Mock SupabaseClient
    mockSupabaseClient = {
      rpc: jest.fn(),
      auth: {
        getSession: jest.fn(),
      },
    };

    // Mock environment service
    mockEnvService = new MockEnvService();
    mockEnvService.set("SUPABASE_URL", "https://test.supabase.co");
    mockEnvService.set("SUPABASE_ANON_KEY", "test-anon-key");
    mockEnvService.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    // Create health service instance with mocked dependencies
    healthService = new HealthService(mockSupabaseClient, mockEnvService);
  });

  test("should return health status with successful checks", async () => {
    // Mock successful database check
    mockSupabaseClient.rpc.mockResolvedValue({
      data: "PostgreSQL 14.0",
      error: null,
    });

    // Mock successful auth check
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await healthService.getDetailedHealth();

    expect(result.status).toBe("ok");
    expect(result.checks.database?.status).toBe("ok");
    expect(result.checks.supabase?.status).toBe("ok");
    expect(result.checks.environment?.status).toBe("ok");
  });
});
