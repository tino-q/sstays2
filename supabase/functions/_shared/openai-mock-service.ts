/**
 * Service Factory for Dependency Injection
 * Provides testable service instantiation with proper dependency injection
 */

import OpenAI from "openai";

/**
 * Factory for creating services with dependency injection
 */
export class OpenAIMockService {
  private static mockListingId: string | null = null;

  /**
   * Set the mock listing ID for testing purposes
   */
  public static setMockListingId(listingId: string): void {
    OpenAIMockService.mockListingId = listingId;
  }

  /**
   * Clear the mock listing ID
   */
  public static clearMockListingId(): void {
    OpenAIMockService.mockListingId = null;
  }

  /**
   * Create a mock OpenAI instance for testing
   * This will be used in integration tests to provide deterministic responses
   */
  public static createMockOpenAI(): OpenAI {
    const mockOpenAI = {
      chat: {
        completions: {
          create: async (params: any) => {
            console.log("Mock OpenAI called with params:", params);
            return OpenAIMockService.getMockResponse(params);
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
                listing_id: OpenAIMockService.mockListingId, // Use dynamic listing ID if set
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
                listing_id: OpenAIMockService.mockListingId, // Use dynamic listing ID if set
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
