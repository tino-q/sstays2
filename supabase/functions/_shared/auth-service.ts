import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { envService } from "./env-service.ts";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export class AuthService {
  private readonly supabaseClient: SupabaseClient;
  private readonly serviceRoleClient: SupabaseClient;

  constructor() {
    const supabaseUrl = envService.get("SUPABASE_URL");
    const supabaseAnonKey = envService.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = envService.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Missing required Supabase environment variables");
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    this.serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  /**
   * Verify JWT token and return authenticated user
   */
  async verifyToken(authHeader: string): Promise<AuthResult> {
    try {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          success: false,
          error: "Missing or invalid authorization header",
        };
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify the JWT token using Supabase
      const { data: { user }, error } = await this.supabaseClient.auth.getUser(token);

      if (error || !user) {
        return {
          success: false,
          error: error?.message || "Invalid or expired token",
        };
      }

      // Check if user is confirmed
      if (!user.email_confirmed_at) {
        return {
          success: false,
          error: "Email not confirmed",
        };
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email || "",
        role: user.user_metadata?.role || "user",
        metadata: user.user_metadata,
      };

      return {
        success: true,
        user: authenticatedUser,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }
  }

  /**
   * Get user profile with additional data
   */
  async getUserProfile(userId: string): Promise<AuthResult> {
    try {
      const { data: { user }, error } = await this.serviceRoleClient.auth.admin.getUserById(userId);

      if (error || !user) {
        return {
          success: false,
          error: error?.message || "User not found",
        };
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email || "",
        role: user.user_metadata?.role || "user",
        metadata: user.user_metadata,
      };

      return {
        success: true,
        user: authenticatedUser,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get user profile",
      };
    }
  }

  /**
   * Check if user has required role
   */
  hasRequiredRole(user: AuthenticatedUser, requiredRole: string): boolean {
    return user.role === requiredRole || user.role === "admin";
  }

  /**
   * Create authentication middleware for Edge Functions
   */
  createAuthMiddleware(requiredRole?: string) {
    return async (req: Request): Promise<AuthResult> => {
      const authHeader = req.headers.get("authorization");
      const result = await this.verifyToken(authHeader || "");

      if (!result.success) {
        return result;
      }

      // Check role if required
      if (requiredRole && result.user) {
        if (!this.hasRequiredRole(result.user, requiredRole)) {
          return {
            success: false,
            error: "Insufficient permissions",
          };
        }
      }

      return result;
    };
  }

  /**
   * Log authentication event for audit purposes
   */
  async logAuthEvent(userId: string, event: string, details?: Record<string, any>) {
    try {
      // This would typically write to an audit log table
      // For now, we'll just log to console in development
      console.log(`Auth Event: ${event}`, {
        userId,
        timestamp: new Date().toISOString(),
        details,
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error("Failed to log auth event:", error);
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 