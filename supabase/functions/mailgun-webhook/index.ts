/**
 * Mailgun Webhook Handler for Airbnb Reservation Processing
 * Receives POST requests from Mailgun, extracts reservation data, and stores in database
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ServiceFactory } from "../_shared/service-factory.ts";
import { ReservationService } from "../_shared/reservation-service.ts";

interface MailgunWebhookPayload {
  "body-plain"?: string;
  "body-html"?: string;
  subject?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  [key: string]: any;
}

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse the form data from Mailgun
    const formData = await req.formData();
    const webhookData: MailgunWebhookPayload = {};

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString();
    }

    // Extract email content - prefer plain text
    const emailContent =
      webhookData["body-plain"] || webhookData["body-html"] || "";

    if (!emailContent) {
      throw new Error("No email content found in webhook");
    }

    const airbnbParser = ServiceFactory.getAirbnbParser();

    const supabase = ServiceFactory.getSupabaseClient();

    const reservationService = new ReservationService(supabase);

    // Parse the reservation data
    const reservationData = await airbnbParser.parseReservation(emailContent);

    if (!reservationData) {
      throw new Error(
        "Failed to parse reservation data or not an Airbnb confirmation"
      );
    }

    // Insert-or-ignore to treat idempotent webhook replays as success
    const reservation = await reservationService.createReservation(
      reservationData
    );

    return new Response(
      JSON.stringify({
        success: true,
        reservation_id: reservation.id,
        message: "Reservation processed successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", (error as any)?.message, error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error processing webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
