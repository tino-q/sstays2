import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCleaners } from "../hooks/useCleaners";

export default function AssignmentDropdown({ 
  currentAssignedTo, 
  taskId, 
  onAssignmentChange,
  disabled = false 
}) {
  const { t } = useTranslation();
  const { cleaners, loading: cleanersLoading } = useCleaners();
  const [updating, setUpdating] = useState(false);

  const handleAssignmentChange = async (event) => {
    const newAssignedTo = event.target.value || null; // empty string becomes null for "Unassigned"
    
    if (newAssignedTo === currentAssignedTo) return; // No change
    
    setUpdating(true);
    try {
      await onAssignmentChange(taskId, newAssignedTo);
    } catch (error) {
      console.error("Assignment change failed:", error);
      // Reset select to previous value on error
      event.target.value = currentAssignedTo || "";
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentCleanerName = () => {
    if (!currentAssignedTo) return t("assignment.unassigned");
    const cleaner = cleaners.find(c => c.id === currentAssignedTo);
    return cleaner ? cleaner.name : `${t("assignment.unknown")} (${currentAssignedTo.substring(0, 8)}...)`;
  };

  if (cleanersLoading) {
    return <span className="loading-text">{t("assignment.loading")}</span>;
  }

  return (
    <select
      value={currentAssignedTo || ""}
      onChange={handleAssignmentChange}
      disabled={disabled || updating}
      className={`assignment-dropdown ${updating ? 'updating' : ''}`}
      title={`Currently assigned to: ${getCurrentCleanerName()}`}
    >
      <option value="">{t("assignment.unassigned")}</option>
      {cleaners.map(cleaner => (
        <option key={cleaner.id} value={cleaner.id}>
          {cleaner.name}
        </option>
      ))}
    </select>
  );
}