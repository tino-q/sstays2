import { useState } from "react";
import { useCleaners } from "../hooks/useCleaners";

export default function AssignmentDropdown({ 
  currentAssignedTo, 
  taskId, 
  onAssignmentChange,
  disabled = false 
}) {
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
    if (!currentAssignedTo) return "Unassigned";
    const cleaner = cleaners.find(c => c.id === currentAssignedTo);
    return cleaner ? cleaner.name : `Unknown (${currentAssignedTo.substring(0, 8)}...)`;
  };

  if (cleanersLoading) {
    return <span className="loading-text">Loading...</span>;
  }

  return (
    <select
      value={currentAssignedTo || ""}
      onChange={handleAssignmentChange}
      disabled={disabled || updating}
      className={`assignment-dropdown ${updating ? 'updating' : ''}`}
      title={`Currently assigned to: ${getCurrentCleanerName()}`}
    >
      <option value="">Unassigned</option>
      {cleaners.map(cleaner => (
        <option key={cleaner.id} value={cleaner.id}>
          {cleaner.name}
        </option>
      ))}
    </select>
  );
}