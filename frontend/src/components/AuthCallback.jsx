import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { supabase } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Handling auth callback...");

        // Get the session from the URL hash/fragment
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          console.log("Auth successful, redirecting to home...");
          // Redirect to home page after successful authentication
          navigate("/", { replace: true });
        } else {
          console.log("No session found, redirecting to login...");
          // No session found, redirect to login
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Unexpected error in auth callback:", err);
        setError("An unexpected error occurred during authentication.");
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [supabase, navigate]);

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">
            <h2>🔐 Authenticating...</h2>
            <p>Please wait while we complete your sign-in.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">
            <h2>❌ Authentication Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate("/", { replace: true })}>
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
