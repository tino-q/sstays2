import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut, isAdmin, isCleaner } = useAuth();
  const { t } = useTranslation();

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
          {t('navigation.brand')}
        </Link>

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          >
            {t('navigation.dashboard')}
          </Link>
          <Link
            to="/healthcheck"
            className={`nav-link ${
              location.pathname === "/healthcheck" ? "active" : ""
            }`}
          >
            {t('navigation.healthCheck')}
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={`nav-link ${
                  location.pathname === "/admin" ? "active" : ""
                }`}
              >
                {t('navigation.reservations')}
              </Link>
              <Link
                to="/admin/tasks"
                className={`nav-link ${
                  location.pathname === "/admin/tasks" ? "active" : ""
                }`}
              >
                {t('navigation.tasks')}
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
              {t('navigation.myTasks')}
            </Link>
          )}
        </div>

        <div className="nav-user">
          <span className="user-email">{user?.email}</span>
          {isAdmin && <span className="admin-badge">{t('navigation.adminBadge')}</span>}
          {isCleaner && <span className="cleaner-badge">{t('navigation.cleanerBadge')}</span>}
          <LanguageSelector />
          <button onClick={handleSignOut} className="signout-btn">
            {t('navigation.signOut')}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
