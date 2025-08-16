import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import Login from "./Login";

const ProtectedRoute = ({ children }) => {
  console.log("ProtectedRoute rendering...");

  const { user, loading } = useAuth();
  const { t } = useTranslation();

  console.log("ProtectedRoute state:", { user, loading });

  if (loading) {
    console.log("ProtectedRoute: showing loading state");
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">
            <div className="loading-spinner"></div>
            {t("common.loading")}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: showing login component");
    return <Login />;
  }

  console.log("ProtectedRoute: showing protected content");
  return children;
};

export default ProtectedRoute;
