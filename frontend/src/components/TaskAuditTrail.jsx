import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "../utils/taskUtils";

export default function TaskAuditTrail({ taskId, taskService }) {
  const { t } = useTranslation();
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuditTrail = async () => {
      try {
        setLoading(true);
        const data = await taskService.getTaskAuditTrail(taskId);
        setAuditTrail(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (taskId && taskService) {
      fetchAuditTrail();
    }
  }, [taskId, taskService]);

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "INSERT":
        return "➕";
      case "UPDATE":
        return "✏️";
      case "DELETE":
        return "🗑️";
      default:
        return "📝";
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case "INSERT":
        return "audit-insert";
      case "UPDATE":
        return "audit-update";
      case "DELETE":
        return "audit-delete";
      default:
        return "audit-default";
    }
  };

  const formatFieldValues = (oldValues, newValues, changedFields) => {
    if (!changedFields || changedFields.length === 0) return null;

    return changedFields
      .map((field) => {
        const oldValue = oldValues?.[field];
        const newValue = newValues?.[field];

        return {
          field,
          oldValue: oldValue !== undefined ? oldValue : null,
          newValue: newValue !== undefined ? newValue : null,
        };
      })
      .filter((item) => item.oldValue !== item.newValue);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string" && value.includes("T")) {
      // Try to format as datetime
      try {
        return formatDateTime(value);
      } catch {
        return value;
      }
    }
    return String(value);
  };

  const getUserDisplayName = (auditEntry) => {
    // If changed_by is null, it's a system action
    if (!auditEntry.changed_by) {
      return "System";
    }
    if (auditEntry.changed_by_name) {
      return auditEntry.changed_by_name;
    }
    if (auditEntry.changed_by_email) {
      return auditEntry.changed_by_email.split("@")[0];
    }
    return "Unknown User";
  };

  if (loading) {
    return (
      <div className="audit-trail-loading">
        <div className="loading-spinner"></div>
        <p>{t("audit.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-trail-error">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (auditTrail.length === 0) {
    return (
      <div className="audit-trail-empty">
        <p>{t("audit.noHistory")}</p>
      </div>
    );
  }

  return (
    <div className="audit-trail-list">
      {auditTrail.map((entry, index) => (
        <div
          key={entry.id}
          className={`audit-entry ${getActionColor(entry.action_type)}`}
        >
          <div className="audit-entry-header">
            <div className="audit-entry-icon">
              {getActionIcon(entry.action_type)}
            </div>
            <div className="audit-entry-info">
              <div className="audit-entry-action">
                <span className="action-type">{entry.action_type}</span>
                <span className="action-time">
                  {formatDateTime(entry.changed_at)}
                </span>
              </div>
              <div className="audit-entry-user">
                {t("audit.by")} {getUserDisplayName(entry)}
              </div>
            </div>
          </div>

          <div className="audit-entry-content">
            {entry.action_type === "UPDATE" &&
              entry.old_values &&
              entry.new_values && (
                <div className="audit-entry-values">
                  <span className="values-label">
                    {t("audit.valuesChanged")}:
                  </span>
                  <div className="values-list">
                    {formatFieldValues(
                      entry.old_values,
                      entry.new_values,
                      entry.changed_fields
                    )?.map((item, index) => (
                      <div key={index} className="value-item">
                        <span className="field-name">{item.field}:</span>
                        <span className="value-change">
                          <span className="old-value">
                            {formatValue(item.oldValue)}
                          </span>
                          <span className="arrow">→</span>
                          <span className="new-value">
                            {formatValue(item.newValue)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {entry.context && Object.keys(entry.context).length > 0 && (
              <div className="audit-entry-context">
                <span className="context-label">{t("audit.context")}:</span>
                <pre className="context-data">
                  {JSON.stringify(entry.context, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {index < auditTrail.length - 1 && (
            <div className="audit-entry-connector"></div>
          )}
        </div>
      ))}
    </div>
  );
}
