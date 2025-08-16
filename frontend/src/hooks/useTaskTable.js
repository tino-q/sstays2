import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createTaskService } from "../services/TaskService";

export const useTaskTable = (filterByUser = false) => {
  const { supabase, user } = useAuth();
  const taskService = useMemo(() => createTaskService(supabase, user), [supabase, user]);
  
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

  const fetchTasks = useCallback(async () => {
    if (filterByUser && !user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const result = await taskService.queryTasks({
        filterByUser,
        pagination,
        sorting,
        globalFilter
      });

      setTasks(result.tasks);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [taskService, filterByUser, pagination, sorting, globalFilter, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle server-side table state changes
  const handleServerSideChange = useCallback((newState) => {
    if (newState.pagination) {
      setPagination(newState.pagination);
    }
    if (newState.sorting !== undefined) {
      setSorting(newState.sorting);
    }
    if (newState.globalFilter !== undefined) {
      setGlobalFilter(newState.globalFilter);
    }
  }, []);

  // Simplified update functions using TaskService
  const updateTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      await fetchTasks(); // Refresh
    } catch (err) {
      console.error("Error updating task status:", err);
      setError(err.message);
      throw err;
    }
  }, [taskService, fetchTasks]);

  const updateTaskAssignment = useCallback(async (taskId, newAssignedTo) => {
    try {
      await taskService.updateTaskAssignment(taskId, newAssignedTo, user?.id);
      await fetchTasks(); // Refresh
    } catch (err) {
      console.error("Error updating task assignment:", err);
      setError(err.message);
      throw err;
    }
  }, [taskService, fetchTasks, user?.id]);

  const updateTaskTimes = useCallback(async (taskId, timeUpdates) => {
    try {
      await taskService.updateTaskTimes(taskId, timeUpdates);
      await fetchTasks(); // Refresh
    } catch (err) {
      console.error("Error updating task times:", err);
      setError(err.message);
      throw err;
    }
  }, [taskService, fetchTasks]);

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
    updateTaskTimes,
    refetchTasks: fetchTasks,
  };
};
