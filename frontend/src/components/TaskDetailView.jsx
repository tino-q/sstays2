import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createTaskService } from "../services/TaskService";
import { formatDateTime, formatDate, formatTaskType } from "../utils/taskUtils";
import AssignmentDropdown from "./AssignmentDropdown";

export default function TaskDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supabase, user, isAdmin } = useAuth();
  const taskService = useMemo(() => createTaskService(supabase, user), [supabase, user]);
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const taskData = await taskService.getTask(id);
      setTask(taskData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskService, id]);

  useEffect(() => {
    if (user && id) {
      fetchTask();
    }
  }, [fetchTask, user, id]);

  const handleBack = () => {
    navigate(-1);
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status}`;
  };

  // Generic field update handler
  const handleFieldUpdate = useCallback(async (field, value) => {
    try {
      setLoading(true);
      await taskService.updateTaskField(task.id, field, value);
      await fetchTask(); // Refresh
      setEditingField(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskService, task?.id, fetchTask]);

  // Time update handler with validation
  const handleTimeUpdate = useCallback(async (field, value) => {
    try {
      setLoading(true);
      
      if (field === 'started_at' || field === 'finished_at') {
        const updates = { [field]: value };
        await taskService.updateTaskTimes(task.id, updates);
      } else {
        await taskService.updateTaskField(task.id, field, value);
      }
      
      await fetchTask(); // Refresh
      setEditingField(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskService, task?.id, fetchTask]);

  // Status update handler
  const handleStatusUpdate = useCallback(async (newStatus) => {
    try {
      setLoading(true);
      await taskService.updateTaskStatus(task.id, newStatus);
      await fetchTask(); // Refresh
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [taskService, task?.id, fetchTask]);

  // Assignment update handler
  const handleAssignmentUpdate = useCallback(async (taskId, newAssignedTo) => {
    try {
      setLoading(true);
      await taskService.updateTaskAssignment(taskId, newAssignedTo, user?.id);
      await fetchTask(); // Refresh
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw for AssignmentDropdown error handling
    } finally {
      setLoading(false);
    }
  }, [taskService, user?.id, fetchTask]);

  const startEdit = useCallback((field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingField(null);
    setEditValue("");
  }, []);

  const EditableField = ({ field, label, value, type = "text" }) => {
    const isEditing = editingField === field;
    
    // Only show edit buttons for time fields if task has been accepted
    const isTimeField = field === 'started_at' || field === 'finished_at';
    const canEditTimeField = !isTimeField || (task.status !== 'assigned' && task.status !== 'unassigned');
    
    if (isEditing) {
      return (
        <div className="time-edit-container">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="time-input"
          />
          <button
            onClick={() => handleTimeUpdate(field, editValue)}
            className="btn-save"
            disabled={loading}
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="time-display-container">
        <span>{value ? formatDateTime(value) : "Not set"}</span>
        {canEditTimeField && (
          <button
            onClick={() => startEdit(field, value ? value.slice(0, 16) : "")}
            className="btn-edit"
            disabled={loading}
          >
            Edit
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="task-detail">
        <div className="task-detail-loading">
          <div className="loading-spinner"></div>
          <p>Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail">
        <div className="task-detail-error">
          <h2>Error Loading Task</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail">
        <div className="task-detail-not-found">
          <h2>Task Not Found</h2>
          <p>The requested task could not be found.</p>
          <button onClick={handleBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <button onClick={handleBack} className="btn-back">
          ← Back
        </button>
        <h1 className="task-detail-title">Task Details</h1>
      </div>

      <div className="task-detail-content">
        <div className="task-detail-section">
          <h2 className="section-title">Task Information</h2>
          <div className="task-info-grid">
            <div className="info-item">
              <label>Title:</label>
              <span>{task.title || "N/A"}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={getStatusBadgeClass(task.status)}>
                {task.status}
              </span>
            </div>
            <div className="info-item">
              <label>Scheduled Date:</label>
              <span>{formatDateTime(task.scheduled_datetime)}</span>
            </div>
            <div className="info-item">
              <label>Listing ID:</label>
              <span>{task.listing_id || "N/A"}</span>
            </div>
            {isAdmin && (
              <div className="info-item">
                <label>Assigned To:</label>
                <AssignmentDropdown
                  currentAssignedTo={task.assigned_to}
                  taskId={task.id}
                  onAssignmentChange={handleAssignmentUpdate}
                  disabled={loading}
                />
              </div>
            )}
            <div className="info-item">
              <label>Started At:</label>
              <EditableField 
                field="started_at" 
                label="Started At" 
                value={task.started_at}
                type="datetime-local"
              />
            </div>
            <div className="info-item">
              <label>Finished At:</label>
              <EditableField 
                field="finished_at" 
                label="Finished At" 
                value={task.finished_at}
                type="datetime-local"
              />
            </div>
          </div>
        </div>

        <div className="task-detail-section">
          <div className="section-header">
            <h2 className="section-title">Actions</h2>
            <div className="section-actions">
              {task.status === 'assigned' && (
                <button 
                  onClick={() => handleStatusUpdate('accepted')} 
                  className="btn-start"
                  disabled={loading}
                >
                  Accept Task
                </button>
              )}
              {task.status === 'accepted' && (
                <button 
                  onClick={() => handleTimeUpdate('started_at', new Date().toISOString())} 
                  className="btn-start"
                  disabled={loading}
                >
                  Start Task
                </button>
              )}
              {task.status === 'in_progress' && !task.finished_at && (
                <button 
                  onClick={() => handleTimeUpdate('finished_at', new Date().toISOString())} 
                  className="btn-end"
                  disabled={loading}
                >
                  Complete Task
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
