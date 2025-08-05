// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { ServiceFactory } from "../../functions/_shared/service-factory";

// Mock environment service
jest.mock("../../functions/_shared/env-service.ts", () => ({
  envService: {
    get: jest.fn((key: string) => {
      const envVars: Record<string, string> = {
        OPENAI_API_KEY: "test-openai-key",
        NODE_ENV: "production",
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      };
      return envVars[key];
    }),
  },
}));

describe("ServiceFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("works", () => {});
});
