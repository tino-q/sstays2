import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-content">
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            📋 Reservations
          </Link>
          <Link 
            to="/healthcheck" 
            className={`nav-link ${location.pathname === "/healthcheck" ? "active" : ""}`}
          >
            🏥 Health Check
          </Link>
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`nav-link ${location.pathname === "/admin" ? "active" : ""}`}
            >
              🔧 Admin
            </Link>
          )}
        </div>
        
        <div className="user-info">
          <span>Welcome, {user?.email}</span>
          <button onClick={handleSignOut} className="signout-btn">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;