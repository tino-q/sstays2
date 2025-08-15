import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut, isAdmin, isCleaner } = useAuth();

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
        <Link to="/" className="nav-brand">
          Sonsoles Stays
        </Link>

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            to="/healthcheck"
            className={`nav-link ${
              location.pathname === "/healthcheck" ? "active" : ""
            }`}
          >
            Health Check
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`nav-link ${
                  location.pathname === "/admin" ? "active" : ""
                }`}
              >
                Reservations
              </Link>
              <Link
                to="/admin/tasks"
                className={`nav-link ${
                  location.pathname === "/admin/tasks" ? "active" : ""
                }`}
              >
                Tasks
              </Link>
            </>
          )}
          {isCleaner && (
            <Link
              to="/cleaner/tasks"
              className={`nav-link ${
                location.pathname === "/cleaner/tasks" ? "active" : ""
              }`}
            >
              My Tasks
            </Link>
          )}
        </div>

        <div className="nav-user">
          <span className="user-email">{user?.email}</span>
          {isAdmin && <span className="admin-badge">Admin</span>}
          {isCleaner && <span className="cleaner-badge">Cleaner</span>}
          <button onClick={handleSignOut} className="signout-btn">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
