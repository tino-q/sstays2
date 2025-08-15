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
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading health status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2 className="error-title">Health Check Failed</h2>
        <p className="error-message">{error}</p>
        {error.includes("Authentication failed") && (
          <button onClick={() => window.location.reload()} className="google-signin-btn" style={{marginTop: 'var(--space-4)'}}>
            Reload Page
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="admin-reservations">
      <div className="admin-header">
        <h1 className="admin-title">System Health Check</h1>
        <p className="admin-stats">Monitoring system status and connectivity</p>
      </div>
      
      {healthData && (
        <div style={{padding: 'var(--space-6)'}}>
          <div style={{display: 'grid', gap: 'var(--space-4)', marginBottom: 'var(--space-6)'}}>
            <div style={{
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--graphite-50)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid var(--graphite-200)`
            }}>
              <strong style={{color: 'var(--graphite-700)'}}>Overall Status:</strong>
              <span className={`status-badge status-${healthData.status === 'ok' ? 'confirmed' : 'cancelled'}`}>
                {healthData.status === "ok" ? "Healthy" : "Error"}
              </span>
            </div>

            {healthData.user && (
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--graphite-50)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid var(--graphite-200)`
              }}>
                <strong style={{color: 'var(--graphite-700)'}}>Authenticated User:</strong>
                <span style={{color: 'var(--graphite-900)'}}>{healthData.user.email}</span>
              </div>
            )}

            {healthData.checks?.database && (
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--graphite-50)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid var(--graphite-200)`
              }}>
                <strong style={{color: 'var(--graphite-700)'}}>Database:</strong>
                <div style={{textAlign: 'right'}}>
                  <span className={`status-badge status-${healthData.checks.database.status === 'ok' ? 'confirmed' : 'cancelled'}`}>
                    {healthData.checks.database.status === "ok" ? "Connected" : "Error"}
                  </span>
                  {healthData.checks.database.version && (
                    <div style={{fontSize: '0.75rem', color: 'var(--graphite-500)', marginTop: 'var(--space-1)'}}>
                      Version: {healthData.checks.database.version}
                    </div>
                  )}
                </div>
              </div>
            )}

            {healthData.checks?.supabase && (
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--graphite-50)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid var(--graphite-200)`
              }}>
                <strong style={{color: 'var(--graphite-700)'}}>Supabase API:</strong>
                <span className={`status-badge status-${healthData.checks.supabase.status === 'ok' ? 'confirmed' : 'cancelled'}`}>
                  {healthData.checks.supabase.status === "ok" ? "Connected" : "Error"}
                </span>
              </div>
            )}

            {healthData.checks?.environment && (
              <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--graphite-50)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid var(--graphite-200)`
              }}>
                <strong style={{color: 'var(--graphite-700)'}}>Environment:</strong>
                <span className={`status-badge status-${healthData.checks.environment.status === 'ok' ? 'confirmed' : 'cancelled'}`}>
                  {healthData.checks.environment.status === "ok" ? "Configured" : "Error"}
                </span>
              </div>
            )}
          </div>

          <div style={{
            textAlign: 'center',
            color: 'var(--graphite-500)',
            fontSize: '0.875rem',
            fontStyle: 'italic',
            paddingTop: 'var(--space-4)',
            borderTop: `1px solid var(--graphite-200)`
          }}>
            Last checked: {new Date(healthData.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthCheck;