import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { HealthService } from "../_shared/health-service.ts";
import { authService, AuthResult } from "../_shared/auth-service.ts";
import { envService } from "../_shared/env-service.ts";

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
    const url = new URL(req.url);
    const path = url.pathname;

    // Initialize Supabase client
    const supabaseClient = createClient(
      envService.get("SUPABASE_URL") ?? "",
      envService.get("SUPABASE_ANON_KEY") ?? ""
    );

    if (!path.endsWith("/health")) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Log successful authentication
    await authService.logAuthEvent(authResult.user!.id, "health_check_access");

    const healthService = new HealthService(supabaseClient);
    const healthData = await healthService.getDetailedHealth();

    // Add user-specific information to health response
    const response = {
      ...healthData,
      user: {
        id: authResult.user!.id,
        email: authResult.user!.email,
        role: authResult.user!.role,
      },
      authenticated: true,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Health endpoint error:", error);
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
