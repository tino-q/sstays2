import { useAuth } from "../contexts/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, adminLoading } = useAuth();

  if (loading || adminLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">
            <div className="loading-spinner"></div>
            Checking admin access...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="access-denied">
            <div className="access-denied-icon">🔐</div>
            <h2 className="access-denied-title">Authentication Required</h2>
            <p className="access-denied-description">Please sign in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="access-denied">
            <div className="access-denied-icon">🚫</div>
            <h2 className="access-denied-title">Admin Access Required</h2>
            <p className="access-denied-description">You do not have admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;