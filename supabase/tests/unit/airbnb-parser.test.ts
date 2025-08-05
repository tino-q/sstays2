// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { AirbnbReservationParser } from "../../functions/_shared/airbnb-parser";

// Mock environment service only
jest.mock("../../functions/_shared/env-service.ts", () => ({
  envService: {
    get: jest.fn(() => "test-openai-key"),
  },
}));

describe("AirbnbReservationParser", () => {
  let parser;
  let mockOpenAI;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock OpenAI instance - no default response, each test will set its own
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Use dependency injection only for OpenAI, real Joi schema will be used
    parser = new AirbnbReservationParser(mockOpenAI);
  });

  describe("parseReservation", () => {
    test("should return null for non-Airbnb emails", async () => {
      const nonAirbnbEmail =
        "Hello, this is a regular newsletter from our company.";

      const result = await parser.parseReservation(nonAirbnbEmail);

      expect(result).toBeNull();
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    test("should successfully parse valid Airbnb confirmation email", async () => {
      const airbnbEmail =
        "Your reservation is confirmed - Airbnb\nConfirmation: HM4SNC5CAP";

      // Mock successful OpenAI response
      const mockAIResponse = {
        reservation_id: "HM4SNC5CAP",
        guest_name: "John Doe",
        property_name: "Downtown Apartment",
        check_in_date: "15-01-2024",
        check_out_date: "18-01-2024",
        nights: 3,
        party_size: 2,
        guest_total: 570.0,
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIResponse),
            },
          },
        ],
      });

      const result = await parser.parseReservation(airbnbEmail);

      expect(result).toBeDefined();
      expect(result.id).toBe("HM4SNC5CAP");
      expect(result.guest_name).toBe("John Doe");
      expect(result.property_name).toBe("Downtown Apartment");
      expect(result.status).toBe("confirmed");
      expect(result.nights).toBe(3);
      expect(result.party_size).toBe(2);
      expect(result.pricing_guest_total).toBe(570.0);
      expect(result.ai_notes).toBeNull();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content:
              "You are an expert at extracting structured data from Airbnb reservation confirmation emails.\n\nGiven the plain text body of an Airbnb reservation confirmation email, extract the following information and return it as a JSON object. If any field cannot be found or is empty, use null for that field.\n\nRequired fields to extract:\n- reservation_id: The confirmation code (usually 10 alphanumeric characters)\n- thread_id: Message thread ID from URLs (return as string)\n- property_id: The property ID from Airbnb URLs (return as string)\n- property_name: The name/title of the property\n- guest_name: Full name of the guest\n- guest_location: Guest's city/country if mentioned\n- guest_message: Any personal message from the guest to the host\n- check_in_date: Check-in date in DD-MM-YYYY format\n- check_out_date: Check-out date in DD-MM-YYYY format\n- nights: Number of nights stayed\n- party_size: Number of guests\n- nightly_rate: Price per night (number only, no currency)\n- subtotal: Subtotal before fees (number only)\n- cleaning_fee: Cleaning fee amount (number only)\n- guest_service_fee: Guest service fee (number only)\n- guest_total: Total amount guest paid (number only)\n- host_service_fee: Host service fee amount (negative number)\n- host_payout: Final amount host receives (number only)\n\nReturn only the JSON object with extracted data, no additional text or explanation.\n\nEmail body to process:\nYour reservation is confirmed - Airbnb\nConfirmation: HM4SNC5CAP",
          },
        ],
        temperature: 0.1,
      });
    });

    test("should return null when OpenAI fails to extract data", async () => {
      const airbnbEmail = "Your reservation is confirmed - Airbnb";

      // Mock OpenAI returning invalid JSON
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: "Unable to parse reservation data",
            },
          },
        ],
      });

      const result = await parser.parseReservation(airbnbEmail);

      expect(result).toBeNull();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    test("should handle OpenAI API errors gracefully", async () => {
      const airbnbEmail = "Your reservation is confirmed - Airbnb";

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("OpenAI API Error")
      );

      const result = await parser.parseReservation(airbnbEmail);

      expect(result).toBeNull();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    test("should return null when schema validation fails", async () => {
      const airbnbEmail = "Your reservation is confirmed - Airbnb";

      // Mock OpenAI returning data that will fail real Joi validation
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reservation_id: "TEST123",
                guest_name: "John Doe",
                nights: "invalid_number", // This should fail Joi validation (string instead of number)
                check_in_date: "invalid-date-format", // This should fail pattern validation
              }),
            },
          },
        ],
      });

      const result = await parser.parseReservation(airbnbEmail);

      expect(result).toBeNull();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    test("should call OpenAI with correct parameters and prompt", async () => {
      const airbnbEmail =
        "Your reservation is confirmed - Airbnb\nConfirmation: ABC123";

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reservation_id: "ABC123",
                guest_name: "Test Guest",
              }),
            },
          },
        ],
      });

      await parser.parseReservation(airbnbEmail);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: expect.stringContaining(
              "You are an expert at extracting structured data from Airbnb reservation confirmation emails"
            ),
          },
        ],
        temperature: 0.1,
      });

      // Verify the prompt includes our email content
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(airbnbEmail);

      // Verify the prompt includes key field requirements
      expect(callArgs.messages[0].content).toContain("reservation_id");
      expect(callArgs.messages[0].content).toContain("guest_name");
      expect(callArgs.messages[0].content).toContain("check_in_date");
      expect(callArgs.messages[0].content).toContain("DD-MM-YYYY format");
      expect(callArgs.messages[0].content).toContain("JSON object");
    });
  });
});
