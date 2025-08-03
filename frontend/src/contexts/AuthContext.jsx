import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with proper local/remote configuration
const useLocal = import.meta.env.VITE_USE_LOCAL === "true";
const supabaseUrl = useLocal
  ? import.meta.env.VITE_SUPABASE_URL_LOCAL || "http://127.0.0.1:54321"
  : import.meta.env.VITE_SUPABASE_URL_REMOTE;
const supabaseAnonKey = useLocal
  ? import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

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

  useEffect(() => {
    console.log("AuthProvider useEffect running...");

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("Initial session:", session);
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
    getAccessToken,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
