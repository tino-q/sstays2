import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HealthCheck from "./components/HealthCheck";
import AuthCallback from "./components/AuthCallback";
import "./App.css";

function App() {
  console.log("App component rendering...");

  return (
    <div style={{ padding: "20px" }}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HealthCheck />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
