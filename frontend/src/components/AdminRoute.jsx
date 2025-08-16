import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const { t } = useTranslation();

  if (loading || adminLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">
            <div className="loading-spinner"></div>
            {t("admin.checkingAccess")}
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
            <h2 className="access-denied-title">{t("admin.authenticationRequired")}</h2>
            <p className="access-denied-description">{t("admin.signInToAccess")}</p>
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
            <h2 className="access-denied-title">{t("admin.adminAccessRequired")}</h2>
            <p className="access-denied-description">{t("admin.noAdminPrivileges")}</p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AdminRoute;