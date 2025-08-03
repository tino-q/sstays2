import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { HealthService } from "../_shared/health-service.ts";
import { envService } from "../_shared/env-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Support both /health and /health/detailed endpoints
    if (!path.endsWith("/health") && !path.endsWith("/health/detailed")) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const healthService = new HealthService(supabaseClient);
    const response = JSON.stringify(await healthService.getDetailedHealth());
    return new Response(response, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
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
