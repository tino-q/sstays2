import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  formatDateTime,
  formatDate,
  formatTaskType,
  formatTruncatedId,
  formatDescription,
} from "../utils/taskUtils";
import AssignmentDropdown from "../components/AssignmentDropdown";

export const useTranslatedColumns = () => {
  const { t } = useTranslation();

  const createBaseColumns = useMemo(
    () => ({
      id: {
        accessorKey: "id",
        header: t("columns.id"),
        cell: ({ getValue }) => {
          const id = getValue();
          return (
            <span className="reservation-id" title={id}>
              {formatTruncatedId(id)}
            </span>
          );
        },
        enableSorting: false,
      },

      title: {
        accessorKey: "title",
        header: t("columns.title"),
        cell: ({ getValue }) => getValue() || t("columns.na"),
      },

      taskTitle: {
        accessorKey: "title",
        header: t("columns.task"),
        cell: ({ getValue }) => getValue() || t("columns.na"),
      },

      taskType: {
        accessorKey: "task_type",
        header: t("columns.type"),
        cell: ({ getValue }) => formatTaskType(getValue()),
      },

      status: {
        accessorKey: "status",
        header: t("columns.status"),
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <span className={`status-badge status-${status}`}>
              {t(`statuses.${status}`)}
            </span>
          );
        },
      },

      description: {
        accessorKey: "description",
        header: t("columns.description"),
        cell: ({ getValue }) => formatDescription(getValue()),
      },

      listingId: {
        accessorKey: "listing_id",
        header: t("columns.listing"),
        cell: ({ getValue }) => getValue() || t("columns.na"),
      },

      reservationId: {
        accessorKey: "reservation_id",
        header: t("columns.reservation"),
        cell: ({ getValue }) => {
          const reservationId = getValue();
          if (!reservationId) return t("columns.na");
          return (
            <span className="reservation-id" title={reservationId}>
              {formatTruncatedId(reservationId)}
            </span>
          );
        },
      },

      scheduledDateTime: {
        accessorKey: "scheduled_datetime",
        header: t("columns.scheduled"),
        cell: ({ getValue }) => formatDateTime(getValue()),
      },

      assignedTo: {
        accessorKey: "assigned_to",
        header: t("columns.assignedTo"),
        cell: ({ getValue }) => {
          const userId = getValue();
          if (!userId) return t("statuses.unassigned");
          return (
            <span className="reservation-id" title={userId}>
              {formatTruncatedId(userId)}
            </span>
          );
        },
      },

      assignedAt: {
        accessorKey: "assigned_at",
        header: t("columns.assignedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
      },

      acceptedAt: {
        accessorKey: "accepted_at",
        header: t("columns.acceptedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
      },

      completedAt: {
        accessorKey: "completed_at",
        header: t("columns.completedAt"),
        cell: ({ getValue }) => formatDateTime(getValue()),
      },

      createdAt: {
        accessorKey: "created_at",
        header: t("columns.created"),
        cell: ({ getValue }) => formatDate(getValue()),
      },
    }),
    [t]
  );

  const createAssignmentColumn = useMemo(
    () => (updateTaskAssignment) => ({
      accessorKey: "assigned_to",
      header: t("columns.assignedTo"),
      cell: ({ getValue, row }) => {
        const userId = getValue();
        const task = row.original;

        return (
          <AssignmentDropdown
            currentAssignedTo={userId}
            taskId={task.id}
            onAssignmentChange={updateTaskAssignment}
          />
        );
      },
      enableSorting: false,
    }),
    [t]
  );

  const createAdminActionsColumn = useMemo(
    () => () => ({
      accessorKey: "actions",
      header: t("tasks.actions"),
      cell: ({ row }) => {
        const task = row.original;

        const handleView = () => {
          window.location.href = `/tasks/${task.id}`;
        };

        return (
          <div className="task-actions">
            <button className="btn-view" onClick={handleView}>
              {t("columns.view")}
            </button>
          </div>
        );
      },
      enableSorting: false,
    }),
    [t]
  );

  const createActionsColumn = useMemo(
    () => (updateTaskStatus, updateTaskTimes) => ({
      accessorKey: "actions",
      header: t("tasks.actions"),
      cell: ({ row }) => {
        const task = row.original;
        const canAccept = task.status === "assigned";
        const canStart = task.status === "accepted";
        const canComplete = task.status === "in_progress";
        const canCancel = task.status === "accepted";

        const handleView = () => {
          window.location.href = `/tasks/${task.id}`;
        };

        const handleStart = async () => {
          if (updateTaskTimes) {
            // Use the TaskService method to set started_at which will trigger status change
            await updateTaskTimes(task.id, {
              started_at: new Date().toISOString(),
            });
          } else {
            // Fallback to direct status update
            updateTaskStatus(task.id, "in_progress");
          }
        };

        const handleComplete = async () => {
          if (updateTaskTimes) {
            // Use the TaskService method to set finished_at which will trigger status change
            await updateTaskTimes(task.id, {
              finished_at: new Date().toISOString(),
            });
          } else {
            // Fallback to direct status update
            updateTaskStatus(task.id, "completed");
          }
        };

        return (
          <div className="task-actions">
            <button className="btn-view" onClick={handleView}>
              {t("columns.view")}
            </button>
            {canAccept && (
              <button
                className="btn-accept"
                onClick={() => updateTaskStatus(task.id, "accepted")}
              >
                {t("columns.accept")}
              </button>
            )}
            {canStart && (
              <button className="btn-start" onClick={handleStart}>
                {t("columns.start")}
              </button>
            )}
            {canComplete && (
              <button className="btn-complete" onClick={handleComplete}>
                {t("columns.complete")}
              </button>
            )}
            {canCancel && (
              <button
                className="btn-cancel"
                onClick={() => updateTaskStatus(task.id, "assigned")}
              >
                {t("columns.cancel")}
              </button>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),
    [t]
  );

  const getAdminColumns = useMemo(
    () => (updateTaskAssignment) => {
      const baseColumns = createBaseColumns;
      return [
        baseColumns.id,
        baseColumns.title,
        baseColumns.taskType,
        baseColumns.status,
        baseColumns.listingId,
        baseColumns.reservationId,
        baseColumns.scheduledDateTime,
        createAssignmentColumn(updateTaskAssignment),
        baseColumns.assignedAt,
        baseColumns.acceptedAt,
        baseColumns.completedAt,
        baseColumns.createdAt,
        createAdminActionsColumn(),
      ];
    },
    [createBaseColumns, createAssignmentColumn, createAdminActionsColumn]
  );

  const getCleanerColumns = useMemo(
    () => (updateTaskStatus, updateTaskTimes) => {
      const baseColumns = createBaseColumns;
      return [
        baseColumns.scheduledDateTime,
        baseColumns.listingId,
        baseColumns.taskType,
        baseColumns.status,
        createActionsColumn(updateTaskStatus, updateTaskTimes),
      ];
    },
    [createBaseColumns, createActionsColumn]
  );

  return {
    getAdminColumns,
    getCleanerColumns,
  };
};
