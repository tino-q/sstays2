import { serve } from "std/http/server.ts";
import { ReservationService } from "../_shared/reservation-service.ts";
import { authService, AuthResult } from "../_shared/auth-service.ts";
import { AdminService } from "../_shared/admin-service.ts";
import { ServiceFactory } from "../_shared/service-factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client using ServiceFactory
    const supabaseClient = ServiceFactory.getSupabaseClient();

    // Authenticate the request
    const authResult: AuthResult = await authService.verifyToken(
      req.headers.get("authorization") || ""
    );

    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: authResult.error,
          code: "AUTH_REQUIRED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "GET") {
      const reservationService = new ReservationService(supabaseClient);
      const reservations =
        await reservationService.getAllReservationsSortedByCheckout();

      return new Response(JSON.stringify({ data: reservations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Check if user is admin
      const adminService = new AdminService(supabaseClient);
      const isAdmin = await adminService.isUserAdmin(authResult.user.id);

      if (!isAdmin) {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "Admin access required",
            code: "ADMIN_REQUIRED",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Parse request body
      const body = await req.json();
      const reservationData = body.reservation;

      if (!reservationData) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Missing reservation data",
            code: "MISSING_DATA",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate required fields
      const requiredFields = ['id', 'guest_name', 'check_in', 'check_out'];
      const missingFields = requiredFields.filter(field => !reservationData[field]);
      
      if (missingFields.length > 0) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Missing required fields: ${missingFields.join(', ')}`,
            code: "VALIDATION_ERROR",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const reservationService = new ReservationService(supabaseClient);
      const success = await reservationService.upsertReservation(reservationData);

      if (success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Reservation created successfully",
            id: reservationData.id 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            error: "Internal Server Error",
            message: "Failed to create reservation",
            code: "CREATE_FAILED",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reservations endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: "Internal server error",
          status: 500,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
