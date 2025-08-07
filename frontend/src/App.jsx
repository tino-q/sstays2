import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminReservationForm from "./components/AdminReservationForm";
import HealthCheck from "./components/HealthCheck";
import Navigation from "./components/Navigation";
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
                  <div>
                    <Navigation />
                    <div> Main view placeholder </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/healthcheck"
              element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <HealthCheck />
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div>
                    <Navigation />
                    <AdminReservationForm />
                  </div>
                </AdminRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
