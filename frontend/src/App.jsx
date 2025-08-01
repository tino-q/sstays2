import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [healthData, setHealthData] = useState(null);
  const [detailedHealthData, setDetailedHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true);

        // Determine environment - you can set VITE_USE_LOCAL=true to use local
        const useLocal = import.meta.env.VITE_USE_LOCAL === "true";
        const supabaseUrl = useLocal
          ? import.meta.env.VITE_SUPABASE_URL_LOCAL
          : import.meta.env.VITE_SUPABASE_URL_REMOTE;
        const supabaseKey = useLocal
          ? import.meta.env.VITE_SUPABASE_ANON_KEY_LOCAL
          : import.meta.env.VITE_SUPABASE_ANON_KEY;

        const headers = {
          Authorization: `Bearer ${supabaseKey}`,
        };

        // Fetch basic health check
        const apiUrl = `${supabaseUrl}/health`;
        const basicResponse = await fetch(apiUrl, { headers });
        if (!basicResponse.ok) {
          throw new Error(`HTTP error! status: ${basicResponse.status}`);
        }
        const basicData = await basicResponse.json();
        setHealthData(basicData);

        // Fetch detailed health check
        const detailedApiUrl = `${supabaseUrl}/health/detailed`;
        const detailedResponse = await fetch(detailedApiUrl, { headers });
        if (!detailedResponse.ok) {
          throw new Error(`HTTP error! status: ${detailedResponse.status}`);
        }
        const detailedData = await detailedResponse.json();
        setDetailedHealthData(detailedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>🏥 Health Check</h1>

        {/* Basic Health Status */}
        <div className="health-section">
          <h2>📊 Basic Status</h2>
          <div className={`status-badge ${healthData?.status}`}>
            {healthData?.status === "ok" ? "✅" : "❌"}{" "}
            {healthData?.status?.toUpperCase()}
          </div>
          <div className="health-details">
            <p>
              <strong>Service:</strong> {healthData?.service}
            </p>
            <p>
              <strong>Version:</strong> {healthData?.version}
            </p>
            <p>
              <strong>Timestamp:</strong>{" "}
              {new Date(healthData?.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Detailed Health Status */}
        {detailedHealthData && (
          <div className="health-section">
            <h2>🔍 Detailed Status</h2>
            <div className={`status-badge ${detailedHealthData?.status}`}>
              {detailedHealthData?.status === "ok" ? "✅" : "❌"}{" "}
              {detailedHealthData?.status?.toUpperCase()}
            </div>

            <div className="checks">
              {detailedHealthData?.checks &&
                Object.entries(detailedHealthData.checks).map(
                  ([key, check]) => (
                    <div key={key} className="check-item">
                      <div className="check-header">
                        <span className={`check-status ${check.status}`}>
                          {check.status === "ok" ? "✅" : "❌"}
                        </span>
                        <strong>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </strong>
                      </div>
                      {check.status === "error" && check.error && (
                        <p className="error-text">{check.error}</p>
                      )}
                      {check.responseTime && (
                        <p className="response-time">
                          Response time: {check.responseTime}
                        </p>
                      )}
                      {check.message && (
                        <p className="check-message">{check.message}</p>
                      )}
                      {check.timestamp && (
                        <p className="check-timestamp">
                          Last checked:{" "}
                          {new Date(check.timestamp).toLocaleString()}
                        </p>
                      )}
                      {check.missing && (
                        <p className="missing-vars">
                          Missing: {check.missing.join(", ")}
                        </p>
                      )}
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        <div className="refresh-section">
          <button
            onClick={() => window.location.reload()}
            className="refresh-btn"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
