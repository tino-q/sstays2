import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminReservationForm from "./components/AdminReservationForm";
import AdminTaskView from "./components/AdminTaskView";
import CleanerTaskView from "./components/CleanerTaskView";
import TaskDetailView from "./components/TaskDetailView";
import HealthCheck from "./components/HealthCheck";
import Navigation from "./components/Navigation";
import AuthCallback from "./components/AuthCallback";
import Dashboard from "./components/Dashboard";
import "./App.css";
import "./i18n";

function App() {
  console.log("App component rendering...");

  return (
    <div className="app">
      <LanguageProvider>
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
                        <Dashboard />
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
              <Route
                path="/tasks/:id"
                element={
                  <ProtectedRoute>
                    <div className="app-content">
                      <Navigation />
                      <main className="main-content">
                        <div className="content-container">
                          <TaskDetailView />
                        </div>
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </div>
  );
}

export default App;
