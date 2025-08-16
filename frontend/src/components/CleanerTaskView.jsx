import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import DataTable from "./DataTable";
import { useTaskTable } from "../hooks/useTaskTable";
import { useTranslatedColumns } from "../hooks/useTranslatedColumns.jsx";

export default function CleanerTaskView() {
  const { user } = useAuth();
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
    updateTaskStatus,
    updateTaskTimes,
  } = useTaskTable(true); // true = filter by user (cleaners see only their tasks)

  const { getCleanerColumns } = useTranslatedColumns();
  const columns = useMemo(
    () => getCleanerColumns(updateTaskStatus, updateTaskTimes),
    [getCleanerColumns, updateTaskStatus, updateTaskTimes]
  );

  if (!user) {
    return (
      <div className="cleaner-tasks">
        <div className="error-message">{t("tasks.loginRequired")}</div>
      </div>
    );
  }

  return (
    <div className="cleaner-tasks">
      <div className="cleaner-header">
        <h1 className="cleaner-title">{t("tasks.myTasks")}</h1>
        <p className="cleaner-stats">
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
        className="cleaner-tasks-data-table"
      />
    </div>
  );
}
