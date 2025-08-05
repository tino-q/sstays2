/**
 * Service Factory for Dependency Injection
 * Provides testable service instantiation with proper dependency injection
 */

import { AirbnbReservationParser } from "./airbnb-parser.ts";
import { envService } from "./env-service.ts";
import { createClient } from "@supabase/supabase-js";
import { OpenAIMockService } from "./openai-mock-service.ts";
import { OpenAI } from "openai";

/**
 * Factory for creating services with dependency injection
 */
export class ServiceFactory {
  static getAirbnbParser() {
    // check if USE_MOCK_OPEN_AI is set to true
    const useMockOpenAI = envService.get("USE_MOCK_OPEN_AI") === "true";

    if (useMockOpenAI) {
      console.log("Using mock OpenAI");
      return new AirbnbReservationParser(OpenAIMockService.createMockOpenAI());
    }

    console.log("Using real OpenAI", envService.get("USE_MOCK_OPEN_AI"));

    return new AirbnbReservationParser(
      new OpenAI({
        apiKey: envService.get("OPENAI_API_KEY"),
      })
    );
  }
  public static getSupabaseClient() {
    const supabaseUrl = envService.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      envService.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    return createClient(supabaseUrl, supabaseServiceKey);
  }
}
