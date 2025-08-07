import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getEnvironmentConfig } from "../utils/environment";

// Create Supabase client with proper local/remote configuration
const { useLocal, supabaseUrl, supabaseAnonKey } = getEnvironmentConfig();

console.log("Supabase Configuration:", {
  useLocal,
  supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  envVars: {
    VITE_USE_LOCAL: import.meta.env.VITE_USE_LOCAL,
    VITE_SUPABASE_URL_LOCAL: import.meta.env.VITE_SUPABASE_URL_LOCAL,
    VITE_SUPABASE_ANON_KEY_LOCAL: import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL
      ? "SET"
      : "NOT_SET",
  },
});

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose supabase client globally for testing
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

// Create Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  console.log("AuthProvider rendering...");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const getAccessToken = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  };

  const checkAdminStatus = async (userId) => {
    try {
      console.log("checkAdminStatus: Starting admin check for userId:", userId);
      setAdminLoading(true);
      
      const accessToken = await getAccessToken();
      console.log("checkAdminStatus: Got access token:", !!accessToken);
      
      if (!accessToken) {
        console.log("checkAdminStatus: No access token, setting admin to false");
        setIsAdmin(false);
        return;
      }

      console.log("checkAdminStatus: Querying admin_users table");
      // Check admin status by querying admin_users table
      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      console.log("checkAdminStatus: Query result:", { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error("Admin check error:", error);
        setIsAdmin(false);
        return;
      }

      const isAdmin = !!data;
      console.log("checkAdminStatus: Setting isAdmin to:", isAdmin);
      setIsAdmin(isAdmin);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      console.log("checkAdminStatus: Finished, setting adminLoading to false");
      setAdminLoading(false);
    }
  };

  const handleSessionChange = async (session, event = null) => {
    if (event) {
      console.log("Auth state changed:", event, session?.user?.email);
    } else {
      console.log("Initial session:", session);
    }
    
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
    
    // Check admin status when user is present, otherwise reset to false
    // Don't await this to avoid blocking the UI
    if (session?.user) {
      console.log("Starting admin check for user:", session.user.id);
      checkAdminStatus(session.user.id).catch(error => {
        console.error("Admin check failed:", error);
        setIsAdmin(false);
      });
    } else {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    console.log("AuthProvider useEffect running...");

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await handleSessionChange(session);
      } catch (error) {
        console.error("Error getting initial session:", error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleSessionChange(session, event);
    });

    return () => subscription.unsubscribe();
  }, []);

  console.log("AuthProvider state:", { user, loading, session });

  const signInWithGoogle = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log("Starting Google OAuth sign in...", redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    adminLoading,
    signInWithGoogle,
    signOut,
    getAccessToken,
    checkAdminStatus,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
