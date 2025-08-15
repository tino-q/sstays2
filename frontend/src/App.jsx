import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminReservationForm from "./components/AdminReservationForm";
import AdminTaskView from "./components/AdminTaskView";
import CleanerTaskView from "./components/CleanerTaskView";
import HealthCheck from "./components/HealthCheck";
import Navigation from "./components/Navigation";
import AuthCallback from "./components/AuthCallback";
import "./App.css";

function App() {
  console.log("App component rendering...");

  return (
    <div className="app">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="app-content">
                    <Navigation />
                    <main className="main-content">
                      <div className="content-container">
                        <div className="page-header">
                          <h1 className="page-title">Dashboard</h1>
                          <p className="page-subtitle">Welcome to your stay management system</p>
                        </div>
                        <div className="empty-state">
                          <div className="empty-state-icon">🏠</div>
                          <h2 className="empty-state-title">Dashboard Coming Soon</h2>
                          <p className="empty-state-description">Your main dashboard will be available here.</p>
                        </div>
                      </div>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/healthcheck"
              element={
                <ProtectedRoute>
                  <div className="app-content">
                    <Navigation />
                    <main className="main-content">
                      <div className="content-container">
                        <HealthCheck />
                      </div>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div className="app-content">
                    <Navigation />
                    <main className="main-content">
                      <div className="content-container">
                        <AdminReservationForm />
                      </div>
                    </main>
                  </div>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tasks"
              element={
                <AdminRoute>
                  <div className="app-content">
                    <Navigation />
                    <main className="main-content">
                      <div className="content-container">
                        <AdminTaskView />
                      </div>
                    </main>
                  </div>
                </AdminRoute>
              }
            />
            <Route
              path="/cleaner/tasks"
              element={
                <ProtectedRoute>
                  <div className="app-content">
                    <Navigation />
                    <main className="main-content">
                      <div className="content-container">
                        <CleanerTaskView />
                      </div>
                    </main>
                  </div>
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
