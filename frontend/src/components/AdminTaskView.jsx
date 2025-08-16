import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import DataTable from "./DataTable";
import { useTaskTable } from "../hooks/useTaskTable";
import { useTranslatedColumns } from "../hooks/useTranslatedColumns.jsx";

export default function AdminTaskView() {
  const { t } = useTranslation();
  const {
    tasks,
    loading,
    error,
    totalCount,
    pagination,
    sorting,
    globalFilter,
    handleServerSideChange,
    updateTaskAssignment,
  } = useTaskTable(false); // false = don't filter by user (admin sees all)

  const { getAdminColumns } = useTranslatedColumns();
  const columns = useMemo(
    () => getAdminColumns(updateTaskAssignment),
    [getAdminColumns, updateTaskAssignment]
  );

  return (
    <div className="admin-reservations">
      <div className="admin-header">
        <h1 className="admin-title">{t("tasks.management")}</h1>
        <p className="admin-stats">
          {loading
            ? t("tasks.loading")
            : t("tasks.totalTasks", { count: totalCount })}
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
