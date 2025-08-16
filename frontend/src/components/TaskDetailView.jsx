import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatDateTime, formatDate, formatTaskType } from "../utils/taskUtils";

export default function TaskDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { supabase, user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [editingFinishTime, setEditingFinishTime] = useState(false);
  const [startTimeValue, setStartTimeValue] = useState("");
  const [finishTimeValue, setFinishTimeValue] = useState("");

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);

        // Fetch the specific task using Supabase client
        const { data: taskData, error: fetchError } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            throw new Error("Task not found");
          }
          throw fetchError;
        }

        setTask(taskData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchTask();
    }
  }, [id, user, supabase]);

  const handleBack = () => {
    navigate(-1);
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status}`;
  };

  const handleStartTask = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ accepted_at: now })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Refresh task data
      const { data: updatedTask, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      setTask(updatedTask);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTask = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ completed_at: now })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Refresh task data
      const { data: updatedTask, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      setTask(updatedTask);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStartTime = async () => {
    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ started_at: startTimeValue })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Refresh task data
      const { data: updatedTask, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      setTask(updatedTask);
      setEditingStartTime(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFinishTime = async () => {
    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ finished_at: finishTimeValue })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Refresh task data
      const { data: updatedTask, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      setTask(updatedTask);
      setEditingFinishTime(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStartTime = () => {
    setStartTimeValue(task.started_at ? task.started_at.slice(0, 16) : "");
    setEditingStartTime(true);
  };

  const handleEditFinishTime = () => {
    setFinishTimeValue(task.finished_at ? task.finished_at.slice(0, 16) : "");
    setEditingFinishTime(true);
  };

  const handleCancelEditStartTime = () => {
    setEditingStartTime(false);
    setStartTimeValue("");
  };

  const handleCancelEditFinishTime = () => {
    setEditingFinishTime(false);
    setFinishTimeValue("");
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
            <div className="info-item">
              <label>Started At:</label>
              {editingStartTime ? (
                <div className="time-edit-container">
                  <input
                    type="datetime-local"
                    value={startTimeValue}
                    onChange={(e) => setStartTimeValue(e.target.value)}
                    className="time-input"
                  />
                  <button
                    onClick={handleUpdateStartTime}
                    className="btn-save"
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditStartTime}
                    className="btn-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="time-display-container">
                  <span>{formatDateTime(task.started_at)}</span>
                  <button
                    onClick={handleEditStartTime}
                    className="btn-edit"
                    disabled={loading}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div className="info-item">
              <label>Finished At:</label>
              {editingFinishTime ? (
                <div className="time-edit-container">
                  <input
                    type="datetime-local"
                    value={finishTimeValue}
                    onChange={(e) => setFinishTimeValue(e.target.value)}
                    className="time-input"
                  />
                  <button
                    onClick={handleUpdateFinishTime}
                    className="btn-save"
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditFinishTime}
                    className="btn-cancel"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="time-display-container">
                  <span>{formatDateTime(task.finished_at)}</span>
                  <button
                    onClick={handleEditFinishTime}
                    className="btn-edit"
                    disabled={loading}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="task-detail-section">
          <div className="section-header">
            <h2 className="section-title">Actions</h2>
            <div className="section-actions">
              {!task.accepted_at && (
                <button onClick={handleStartTask} className="btn-start">
                  Set Start Time
                </button>
              )}
              {task.accepted_at && !task.completed_at && (
                <button onClick={handleEndTask} className="btn-end">
                  Set Finish Time
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
