/**
 * Environment utility functions
 */

export const getEnvironmentConfig = () => {
  const useLocal = import.meta.env.VITE_USE_LOCAL === "true";
  
  return {
    useLocal,
    supabaseUrl: useLocal
      ? import.meta.env.VITE_SUPABASE_URL_LOCAL || "http://127.0.0.1:54321"
      : import.meta.env.VITE_SUPABASE_URL_REMOTE,
    supabaseAnonKey: useLocal
      ? import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
      : import.meta.env.VITE_SUPABASE_ANON_KEY
  };
};

export const getApiUrl = (endpoint = '') => {
  const { supabaseUrl } = getEnvironmentConfig();
  return `${supabaseUrl}/functions/v1${endpoint}`;
};