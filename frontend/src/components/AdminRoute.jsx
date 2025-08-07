import { useAuth } from "../contexts/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, adminLoading } = useAuth();

  if (loading || adminLoading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Checking admin access...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card error">
          <div className="error-message">
            <h2>❌ Authentication Required</h2>
            <p>Please sign in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="card error">
          <div className="error-message">
            <h2>🚫 Admin Access Required</h2>
            <p>You do not have admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;