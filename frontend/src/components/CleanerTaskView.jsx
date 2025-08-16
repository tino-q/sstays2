import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import DataTable from "./DataTable";
import { useTaskTable } from "../hooks/useTaskTable";
import { getCleanerColumns } from "../utils/taskColumns.jsx";

export default function CleanerTaskView() {
  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    totalCount,
    pagination,
    sorting,
    globalFilter,
    handleServerSideChange,
    updateTaskStatus,
    updateTaskTimes
  } = useTaskTable(true); // true = filter by user (cleaners see only their tasks)

  const columns = useMemo(() => getCleanerColumns(updateTaskStatus, updateTaskTimes), [updateTaskStatus, updateTaskTimes]);

  if (!user) {
    return (
      <div className="cleaner-tasks">
        <div className="error-message">Please log in to view your tasks.</div>
      </div>
    );
  }

  return (
    <div className="cleaner-tasks">
      <div className="cleaner-header">
        <h1 className="cleaner-title">My Tasks</h1>
        <p className="cleaner-stats">
          {loading ? 'Loading...' : `Total Tasks: ${totalCount}`}
        </p>
      </div>

      <DataTable
        data={tasks}
        columns={columns}
        loading={loading}
        error={error}
        serverSide={true}
        onServerSideChange={handleServerSideChange}
        totalCount={totalCount}
        pageSize={pagination.pageSize}
        pageIndex={pagination.pageIndex}
        sorting={sorting}
        globalFilter={globalFilter}
        className="cleaner-tasks-data-table"
      />
    </div>
  );
}