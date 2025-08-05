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

  describe("createServices", () => {
    test("should create services with production dependencies", () => {
      const services = ServiceFactory.createServices();

      expect(services).toHaveProperty("parser");
      expect(services).toHaveProperty("reservationService");
      expect(services.parser).toBeDefined();
      expect(services.reservationService).toBeDefined();
    });
  });

  describe("createServicesWithDependencies", () => {
    test("should create services with injected dependencies", () => {
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn(),
          },
        },
      } as any;

      const services = ServiceFactory.createServicesWithDependencies(mockOpenAI);

      expect(services).toHaveProperty("parser");
      expect(services).toHaveProperty("reservationService");
      expect(services.parser).toBeDefined();
      expect(services.reservationService).toBeDefined();
    });
  });

  describe("createServicesForEnvironment", () => {
    test("should create production services for production environment", () => {
      const services = ServiceFactory.createServicesForEnvironment("production");

      expect(services).toHaveProperty("parser");
      expect(services).toHaveProperty("reservationService");
    });

    test("should create test services for test environment", () => {
      const services = ServiceFactory.createServicesForEnvironment("test");

      expect(services).toHaveProperty("parser");
      expect(services).toHaveProperty("reservationService");
    });

    test("should create integration services for integration environment", () => {
      const services = ServiceFactory.createServicesForEnvironment("integration");

      expect(services).toHaveProperty("parser");
      expect(services).toHaveProperty("reservationService");
    });
  });
});