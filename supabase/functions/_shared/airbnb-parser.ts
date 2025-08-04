/**
 * Airbnb Reservation Parser for Supabase Edge Functions
 * Adapted from mailgunwebhook POC to work with Deno runtime
 */

import OpenAI from "openai";
import Joi from "joi";
import { envService } from "./env-service.ts";

export interface ReservationData {
  reservation_id: string;
  thread_id?: string;
  property_id?: string;
  property_name?: string;
  guest_name: string;
  guest_location?: string;
  guest_message?: string;
  check_in_date?: string;
  check_out_date?: string;
  nights?: number;
  party_size?: number;
  nightly_rate?: number;
  subtotal?: number;
  cleaning_fee?: number;
  guest_service_fee?: number;
  guest_total?: number;
  host_service_fee?: number;
  host_payout?: number;
  ai_notes?: string;
}

export interface DatabaseReservation {
  id: string;
  property_id?: string | null;
  property_name?: string | null;
  status: string;
  check_in?: Date | null;
  check_out?: Date | null;
  nights?: number | null;
  guest_name: string;
  guest_location?: string | null;
  guest_message?: string | null;
  party_size?: number | null;
  pricing_nightly_rate?: number | null;
  pricing_subtotal?: number | null;
  pricing_cleaning_fee?: number | null;
  pricing_guest_service_fee?: number | null;
  pricing_guest_total?: number | null;
  pricing_host_service_fee?: number | null;
  pricing_host_payout?: number | null;
  thread_id?: string | null;
  ai_notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class AirbnbReservationParser {
  private openai: OpenAI;
  private schema: Joi.ObjectSchema;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || envService.get("OPENAI_API_KEY") || "",
    });

    this.schema = Joi.object({
      reservation_id: Joi.string().required(),
      thread_id: Joi.string().optional(),
      property_id: Joi.string().optional(),
      property_name: Joi.string().optional(),
      guest_name: Joi.string().required(),
      guest_location: Joi.string().optional(),
      guest_message: Joi.string().optional(),
      check_in_date: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .optional(),
      check_out_date: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .optional(),
      nights: Joi.number().integer().min(1).optional(),
      party_size: Joi.number().integer().min(1).optional(),
      nightly_rate: Joi.number().min(0).optional(),
      subtotal: Joi.number().min(0).optional(),
      cleaning_fee: Joi.number().min(0).optional(),
      guest_service_fee: Joi.number().min(0).optional(),
      guest_total: Joi.number().min(0).optional(),
      host_service_fee: Joi.number().optional(),
      host_payout: Joi.number().min(0).optional(),
      ai_notes: Joi.string().optional(),
    });
  }

  async parseReservation(
    emailContent: string
  ): Promise<DatabaseReservation | null> {
    try {
      // Check if this is an Airbnb confirmation email
      if (!this.isAirbnbConfirmation(emailContent)) {
        console.log("Not an Airbnb confirmation email");
        return null;
      }

      console.log("Processing Airbnb confirmation email...");

      // Extract reservation data using AI
      const reservationData = await this.extractReservationData(emailContent);
      if (!reservationData) {
        console.log("Failed to extract reservation data");
        return null;
      }

      // Validate the extracted data
      const validationResult = this.schema.validate(reservationData);
      if (validationResult.error) {
        console.error(
          "Schema validation failed:",
          validationResult.error.details
        );
        return null;
      }

      // AI validation for critical errors
      const aiValidationResult = await this.validateWithAI(
        emailContent,
        reservationData
      );

      reservationData.ai_notes = aiValidationResult.critical_errors.join(", ");

      // Transform to database format
      return this.transformToDatabase(reservationData);
    } catch (error) {
      console.error("Error parsing reservation:", error);
      return null;
    }
  }

  private isAirbnbConfirmation(emailContent: string): boolean {
    const indicators = [
      "airbnb",
      "reservation confirmed",
      "your reservation",
      "check-in",
      "check-out",
    ];

    const lowerContent = emailContent.toLowerCase();
    return indicators.some((indicator) => lowerContent.includes(indicator));
  }

  private async extractReservationData(
    emailContent: string,
    retries = 3
  ): Promise<ReservationData | null> {
    const prompt = `You are an expert at extracting structured data from Airbnb reservation confirmation emails.

Given the plain text body of an Airbnb reservation confirmation email, extract the following information and return it as a JSON object. If any field cannot be found, use null for that field.

Required fields to extract:
- reservation_id: The confirmation code (usually 10 alphanumeric characters)
- thread_id: Message thread ID from URLs (return as string)
- property_id: The property ID from Airbnb URLs (return as string)
- property_name: The name/title of the property
- guest_name: Full name of the guest
- guest_location: Guest's city/country if mentioned
- guest_message: Any personal message from the guest to the host
- check_in_date: Check-in date in DD-MM-YYYY format
- check_out_date: Check-out date in DD-MM-YYYY format
- nights: Number of nights stayed
- party_size: Number of guests
- nightly_rate: Price per night (number only, no currency)
- subtotal: Subtotal before fees (number only)
- cleaning_fee: Cleaning fee amount (number only)
- guest_service_fee: Guest service fee (number only)
- guest_total: Total amount guest paid (number only)
- host_service_fee: Host service fee amount (negative number)
- host_payout: Final amount host receives (number only)

Return only the JSON object with extracted data, no additional text or explanation.

Email body to process:
${emailContent}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) continue;

        // Clean up markdown formatting
        const jsonString = content.replace(/```json\n?|\n?```/g, "").trim();

        try {
          return JSON.parse(jsonString) as ReservationData;
        } catch (parseError) {
          console.log(`JSON parse error on attempt ${attempt}:`, parseError);
          if (attempt === retries) {
            console.error("Failed to parse JSON after all retries");
          }
        }
      } catch (error) {
        console.error(`OpenAI API error on attempt ${attempt}:`, error);
        if (attempt === retries) {
          throw error;
        }
      }
    }

    return null;
  }

  private async validateWithAI(
    originalBody: string,
    extractedData: ReservationData
  ): Promise<{ valid: boolean; critical_errors: string[] }> {
    const prompt = `You are a data validation expert. Your job is to identify CRITICAL configuration errors in extracted reservation data.

ORIGINAL EMAIL BODY:
${originalBody}

EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

Review the extracted data against the original email and identify only CRITICAL errors that would break business logic or cause significant issues. Do NOT be pedantic about minor formatting or optional fields.

When comparing consider that dates are in DD-MM-YYYY format. First The Day, then The Month, then The Year.

The most critical parsing errors are:
- Missing or incorrect checkout date.
- Missing or incorrect thread ID
- Missing or incorrect reservation ID.
- Missing or incorrect listing ID / Name.

Dont focus on:
- Pricing inconsistencies that don't add up (if pricing data exists), dont do math.

Return a JSON object with:
{
  "valid": true/false,
  "critical_errors": ["error1", "error2"] // only critical errors, empty array if none
}

Be concise and focus only on errors that would cause system failures or business problems.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const result = response.choices[0]?.message?.content?.trim();
      if (!result) {
        return {
          valid: false,
          critical_errors: ["No validation response received"],
        };
      }

      // Clean up markdown formatting
      const jsonString = result.replace(/```json\n?|\n?```/g, "").trim();

      try {
        const validationResult = JSON.parse(jsonString);
        return {
          valid: validationResult.valid === true,
          critical_errors: Array.isArray(validationResult.critical_errors)
            ? validationResult.critical_errors
            : [],
        };
      } catch (parseError) {
        console.log("Failed to parse validation JSON, treating as invalid");
        return {
          valid: false,
          critical_errors: ["Failed to parse validation result"],
        };
      }
    } catch (error) {
      console.error("AI validation error:", error);
      return { valid: false, critical_errors: ["AI validation service error"] }; // Fail safe
    }
  }

  private transformToDatabase(data: ReservationData): DatabaseReservation {
    const now = new Date();

    return {
      id: data.reservation_id,
      property_id: data.property_id || null,
      property_name: data.property_name || null,
      status: "confirmed",
      check_in: data.check_in_date ? this.parseDate(data.check_in_date) : null,
      check_out: data.check_out_date
        ? this.parseDate(data.check_out_date)
        : null,
      nights: data.nights || null,
      guest_name: data.guest_name,
      guest_location: data.guest_location || null,
      guest_message: data.guest_message || null,
      party_size: data.party_size || null,
      pricing_nightly_rate: data.nightly_rate || null,
      pricing_subtotal: data.subtotal || null,
      pricing_cleaning_fee: data.cleaning_fee || null,
      pricing_guest_service_fee: data.guest_service_fee || null,
      pricing_guest_total: data.guest_total || null,
      pricing_host_service_fee: data.host_service_fee || null,
      pricing_host_payout: data.host_payout || null,
      thread_id: data.thread_id || null,
      ai_notes: data.ai_notes || null,
      created_at: now,
      updated_at: now,
    };
  }

  private parseDate(dateString: string): Date | null {
    try {
      // Parse DD-MM-YYYY format
      const [day, month, year] = dateString
        .split("-")
        .map((num) => parseInt(num, 10));
      if (!day || !month || !year) return null;

      // Create date at 15:00 UTC for check-in, 10:00 UTC for check-out
      const date = new Date(year, month - 1, day, 15, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}
