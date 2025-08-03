import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [healthData, setHealthData] = useState(null);
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
        const detailedApiUrl = `${supabaseUrl}/health`;
        const detailedResponse = await fetch(detailedApiUrl, { headers });
        if (!detailedResponse.ok) {
          throw new Error(`HTTP error! status: ${detailedResponse.status}`);
        }
        const detailedData = await detailedResponse.json();
        setHealthData(detailedData);
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
      <div className="card error">
        <h1>🏥 Health Check</h1>
        <div className="error-message">
          <h2>{JSON.stringify(healthData)}</h2>
        </div>
      </div>
    </div>
  );
}

export default App;
