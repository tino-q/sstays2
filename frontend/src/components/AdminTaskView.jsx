import { useMemo } from "react";
import DataTable from "./DataTable";
import { useTaskTable } from "../hooks/useTaskTable";
import { getAdminColumns } from "../utils/taskColumns.jsx";

export default function AdminTaskView() {
  const {
    tasks,
    loading,
    error,
    totalCount,
    pagination,
    sorting,
    globalFilter,
    handleServerSideChange,
    updateTaskAssignment
  } = useTaskTable(false); // false = don't filter by user (admin sees all)

  const columns = useMemo(() => getAdminColumns(updateTaskAssignment), [updateTaskAssignment]);

  return (
    <div className="admin-reservations">
      <div className="admin-header">
        <h1 className="admin-title">Task Management</h1>
        <p className="admin-stats">
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
        className="tasks-data-table"
      />
    </div>
  );
}