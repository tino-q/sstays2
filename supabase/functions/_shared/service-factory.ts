/**
 * Service Factory for Dependency Injection
 * Provides testable service instantiation with proper dependency injection
 */

import OpenAI from "openai";
import { AirbnbReservationParser } from "./airbnb-parser.ts";
import { ReservationService } from "./reservation-service.ts";
import { envService } from "./env-service.ts";

export interface ServiceContainer {
  parser: AirbnbReservationParser;
  reservationService: ReservationService;
}

/**
 * Factory for creating services with dependency injection
 */
export class ServiceFactory {
  /**
   * Create services with default production dependencies
   */
  static createServices(): ServiceContainer {
    const openai = new OpenAI({
      apiKey: envService.get("OPENAI_API_KEY") || "",
    });

    return {
      parser: new AirbnbReservationParser(openai),
      reservationService: new ReservationService(),
    };
  }

  /**
   * Create services with injected dependencies (for testing)
   */
  static createServicesWithDependencies(
    openaiInstance: OpenAI,
    reservationService?: ReservationService
  ): ServiceContainer {
    return {
      parser: new AirbnbReservationParser(openaiInstance),
      reservationService: reservationService || new ReservationService(),
    };
  }

  /**
   * Create services based on environment (useful for integration tests)
   */
  static createServicesForEnvironment(env?: string): ServiceContainer {
    const environment = env || envService.get("NODE_ENV") || "production";

    if (environment === "test" || environment === "integration") {
      // For test environments, we might want to inject mocked services
      const mockOpenAI = ServiceFactory.createMockOpenAI();
      return ServiceFactory.createServicesWithDependencies(mockOpenAI);
    }

    return ServiceFactory.createServices();
  }

  /**
   * Create a mock OpenAI instance for testing
   * This will be used in integration tests to provide deterministic responses
   */
  private static createMockOpenAI(): OpenAI {
    const mockOpenAI = {
      chat: {
        completions: {
          create: async (params: any) => {
            return ServiceFactory.getMockResponse(params);
          },
        },
      },
    } as unknown as OpenAI;

    return mockOpenAI;
  }

  /**
   * Generate mock OpenAI responses based on email content
   * This provides deterministic responses for integration testing
   */
  private static getMockResponse(params: any): any {
    const content = params.messages?.[0]?.content || "";

    // Parse test email patterns and return appropriate mock responses
    if (content.includes("Confirmation: TEST123")) {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                reservation_id: "TEST123",
                guest_name: "John Doe",
                property_name: "Test Property",
                check_in_date: "15-01-2024",
                check_out_date: "18-01-2024",
                nights: 3,
                party_size: 2,
                guest_total: 570.0,
              }),
            },
          },
        ],
      };
    }

    if (content.includes("Confirmation: DUPLICATE456")) {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                reservation_id: "DUPLICATE456",
                guest_name: "Jane Smith",
                property_name: "Duplicate Test Property",
                check_in_date: "20-01-2024",
                check_out_date: "23-01-2024",
                nights: 3,
                party_size: 1,
                guest_total: 450.0,
              }),
            },
          },
        ],
      };
    }

    if (content.includes("Confirmation: INVALID789")) {
      // Return invalid data to test schema validation
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                reservation_id: "INVALID789",
                guest_name: "Invalid User",
                nights: "not-a-number", // Invalid type
                check_in_date: "invalid-date-format", // Invalid format
              }),
            },
          },
        ],
      };
    }

    // Default case - return failure to parse
    return {
      choices: [
        {
          message: {
            content: "Unable to parse reservation data from this email",
          },
        },
      ],
    };
  }
}
