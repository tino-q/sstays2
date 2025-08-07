import { SupabaseClient } from "@supabase/supabase-js";

export class AdminService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if a user is an admin
   * @param userId - The user ID to check
   * @returns Promise<boolean> - True if user is admin, false otherwise
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (error) {
        // User not found in admin_users table means they're not admin
        if (error.code === 'PGRST116') {
          return false;
        }
        console.error("Admin check error:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Admin service error:", error);
      return false;
    }
  }

  /**
   * Get admin user info if user is admin
   * @param userId - The user ID to check
   * @returns Promise<AdminUser | null> - Admin user info or null
   */
  async getAdminUserInfo(userId: string): Promise<AdminUser | null> {
    try {
      const { data, error } = await this.supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error("Admin info fetch error:", error);
        return null;
      }

      return data as AdminUser;
    } catch (error) {
      console.error("Admin service error:", error);
      return null;
    }
  }
}

export interface AdminUser {
  user_id: string;
  created_at: string;
}