import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export const useTaskTable = (filterByUser = false) => {
  const { supabase, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Table state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([
    { id: "scheduled_datetime", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchTasks = async () => {
    if (filterByUser && !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase.from("tasks").select("*", { count: "exact" });

      // Filter by user if required
      if (filterByUser && user?.id) {
        query = query.eq("assigned_to", user.id);
      }

      // Apply global filter (search across multiple columns)
      if (globalFilter) {
        query = query.or(
          `title.ilike.%${globalFilter}%,description.ilike.%${globalFilter}%,task_type.ilike.%${globalFilter}%,status.ilike.%${globalFilter}%`
        );
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setTasks(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [pagination, sorting, globalFilter, user?.id]);

  // Handle server-side table state changes
  const handleServerSideChange = (newState) => {
    if (newState.pagination) {
      setPagination(newState.pagination);
    }
    if (newState.sorting !== undefined) {
      setSorting(newState.sorting);
    }
    if (newState.globalFilter !== undefined) {
      setGlobalFilter(newState.globalFilter);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const updates = { status: newStatus };

      // Add timestamp based on status
      if (newStatus === "accepted") {
        updates.accepted_at = new Date().toISOString();
      } else if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      // Refresh tasks to show updated status
      fetchTasks();
    } catch (err) {
      console.error("Error updating task status:", err);
      setError(err.message);
    }
  };

  // Update task assignment
  const updateTaskAssignment = async (taskId, newAssignedTo) => {
    try {
      const updates = {
        assigned_to: newAssignedTo,
        assigned_at: newAssignedTo ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      // Refresh tasks to show updated assignment
      fetchTasks();
    } catch (err) {
      console.error("Error updating task assignment:", err);
      setError(err.message);
      throw err; // Re-throw so UI can handle it
    }
  };

  return {
    tasks,
    loading,
    error,
    totalCount,
    pagination,
    sorting,
    globalFilter,
    handleServerSideChange,
    updateTaskStatus,
    updateTaskAssignment,
    refetchTasks: fetchTasks,
  };
};
