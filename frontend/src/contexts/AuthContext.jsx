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
  const [isCleaner, setIsCleaner] = useState(false);
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

  const checkUserRoles = async (userId) => {
    try {
      console.log("checkUserRoles: Starting role check for userId:", userId);
      setAdminLoading(true);
      
      const accessToken = await getAccessToken();
      console.log("checkUserRoles: Got access token:", !!accessToken);
      
      if (!accessToken) {
        console.log("checkUserRoles: No access token, setting roles to false");
        setIsAdmin(false);
        setIsCleaner(false);
        return;
      }

      console.log("checkUserRoles: Querying roles table");
      // Check user roles by querying roles table
      const { data, error } = await supabase
        .from("roles")
        .select("role")
        .eq("user_id", userId);

      console.log("checkUserRoles: Query result:", { data, error });

      if (error) {
        console.error("Role check error:", error);
        setIsAdmin(false);
        setIsCleaner(false);
        return;
      }

      const roles = data?.map(r => r.role) || [];
      const isAdmin = roles.includes("admin");
      const isCleaner = roles.includes("cleaner");
      
      console.log("checkUserRoles: Setting roles - isAdmin:", isAdmin, "isCleaner:", isCleaner);
      setIsAdmin(isAdmin);
      setIsCleaner(isCleaner);
    } catch (error) {
      console.error("Error checking user roles:", error);
      setIsAdmin(false);
      setIsCleaner(false);
    } finally {
      console.log("checkUserRoles: Finished, setting adminLoading to false");
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
    
    // Check user roles when user is present, otherwise reset to false
    // Don't await this to avoid blocking the UI
    if (session?.user) {
      console.log("Starting role check for user:", session.user.id);
      checkUserRoles(session.user.id).catch(error => {
        console.error("Role check failed:", error);
        setIsAdmin(false);
        setIsCleaner(false);
      });
    } else {
      setIsAdmin(false);
      setIsCleaner(false);
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
    isCleaner,
    adminLoading,
    signInWithGoogle,
    signOut,
    getAccessToken,
    checkUserRoles,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
