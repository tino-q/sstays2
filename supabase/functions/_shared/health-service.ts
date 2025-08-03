import { SupabaseClient } from "@supabase/supabase-js";
import { EnvService, envService } from "./env-service.ts";

interface HealthCheck {
  status: "ok" | "error";
  timestamp: string;
  checks: {
    database?: {
      status: "ok" | "error";
      responseTime?: number;
      timestamp?: string;
      version?: string;
      error?: string;
    };
    supabase?: {
      status: "ok" | "error";
      responseTime?: string;
      error?: string;
    };
    environment?: {
      status: "ok" | "error";
      message?: string;
      missing?: string[];
    };
  };
}

export class HealthService {
  private readonly supabaseClient: SupabaseClient;
  private readonly envService: EnvService;

  constructor(
    supabaseClient: SupabaseClient,
    envServiceInstance: EnvService = envService
  ) {
    this.supabaseClient = supabaseClient;
    this.envService = envServiceInstance;
  }

  /**
   * Get detailed health status with dependency checks
   */
  async getDetailedHealth(): Promise<HealthCheck> {
    const healthStatus: HealthCheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: {},
    };

    let hasErrors = false;

    // Check database connection and get PostgreSQL version via RPC
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabaseClient.rpc("get_db_version");

      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      healthStatus.checks.database = {
        status: "ok",
        responseTime,
        timestamp: new Date().toISOString(),
        version: data || "PostgreSQL Connected",
      };
    } catch (error: any) {
      hasErrors = true;
      healthStatus.checks.database = {
        status: "error",
        error: error.message,
      };
    }

    // Check Supabase API connection
    try {
      const startTime = Date.now();
      const { data, error } = await this.supabaseClient.auth.getSession();
      const responseTime = Date.now() - startTime;

      if (error) {
        throw error;
      }

      healthStatus.checks.supabase = {
        status: "ok",
        responseTime: `${responseTime}ms`,
      };
    } catch (error: any) {
      hasErrors = true;
      healthStatus.checks.supabase = {
        status: "error",
        error: error.message,
      };
    }

    // Check environment variables
    const requiredEnvVars = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !this.envService.get(varName)
    );

    if (missingEnvVars.length > 0) {
      hasErrors = true;
      healthStatus.checks.environment = {
        status: "error",
        missing: missingEnvVars,
      };
    } else {
      healthStatus.checks.environment = {
        status: "ok",
        message: "All required environment variables are set",
      };
    }

    // Overall status
    if (hasErrors) {
      healthStatus.status = "error";
    }

    return healthStatus;
  }
}
