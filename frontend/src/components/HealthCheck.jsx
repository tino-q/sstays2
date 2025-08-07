import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const HealthCheck = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, getAccessToken, signOut } = useAuth();

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get access token for authenticated request
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("No access token available");
        }

        // Determine environment
        const useLocal = import.meta.env.VITE_USE_LOCAL === "true";
        const supabaseUrl = useLocal
          ? import.meta.env.VITE_SUPABASE_URL_LOCAL
          : import.meta.env.VITE_SUPABASE_URL_REMOTE;

        const headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        };

        // Fetch health check with authentication
        const apiUrl = `${supabaseUrl}/functions/v1/health`;
        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication failed. Please sign in again.");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setHealthData(data);
      } catch (err) {
        setError(err.message);
        console.error("Health check error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHealthData();
    }
  }, [user, getAccessToken]);


  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <h1>🏥 Health Check</h1>
          <div className="loading">Loading health status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card error">
          <h1>🏥 Health Check</h1>
          <div className="error-message">
            <h2>❌ Error</h2>
            <p>{error}</p>
            {error.includes("Authentication failed") && (
              <button onClick={() => window.location.reload()} className="retry-btn">
                Reload Page
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="health-content">
          {healthData && (
            <div className="health-data">
              <h2>System Status</h2>
              <div className="status-grid">
                <div className="status-item">
                  <strong>Overall Status:</strong>
                  <span className={`status ${healthData.status}`}>
                    {healthData.status === "ok" ? "✅ Healthy" : "❌ Error"}
                  </span>
                </div>

                {healthData.user && (
                  <div className="status-item">
                    <strong>Authenticated User:</strong>
                    <span>{healthData.user.email}</span>
                  </div>
                )}

                {healthData.checks?.database && (
                  <div className="status-item">
                    <strong>Database:</strong>
                    <span
                      className={`status ${healthData.checks.database.status}`}
                    >
                      {healthData.checks.database.status === "ok"
                        ? "✅ Connected"
                        : "❌ Error"}
                    </span>
                    {healthData.checks.database.version && (
                      <div className="version">
                        Version: {healthData.checks.database.version}
                      </div>
                    )}
                  </div>
                )}

                {healthData.checks?.supabase && (
                  <div className="status-item">
                    <strong>Supabase API:</strong>
                    <span
                      className={`status ${healthData.checks.supabase.status}`}
                    >
                      {healthData.checks.supabase.status === "ok"
                        ? "✅ Connected"
                        : "❌ Error"}
                    </span>
                  </div>
                )}

                {healthData.checks?.environment && (
                  <div className="status-item">
                    <strong>Environment:</strong>
                    <span
                      className={`status ${healthData.checks.environment.status}`}
                    >
                      {healthData.checks.environment.status === "ok"
                        ? "✅ Configured"
                        : "❌ Error"}
                    </span>
                  </div>
                )}
              </div>

              <div className="timestamp">
                Last checked: {new Date(healthData.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;