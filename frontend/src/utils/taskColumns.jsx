import {
  formatDateTime,
  formatDate,
  formatTaskType,
  formatTruncatedId,
  formatDescription,
} from "./taskUtils";
import AssignmentDropdown from "../components/AssignmentDropdown";

// Base column definitions
export const createBaseColumns = () => ({
  id: {
    accessorKey: "id",
    header: "ID",
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
    header: "Title",
    cell: ({ getValue }) => getValue() || "N/A",
  },

  taskTitle: {
    accessorKey: "title",
    header: "Task",
    cell: ({ getValue }) => getValue() || "N/A",
  },

  taskType: {
    accessorKey: "task_type",
    header: "Type",
    cell: ({ getValue }) => formatTaskType(getValue()),
  },

  status: {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue();
      return <span className={`status-badge status-${status}`}>{status}</span>;
    },
  },

  description: {
    accessorKey: "description",
    header: "Description",
    cell: ({ getValue }) => formatDescription(getValue()),
  },

  listingId: {
    accessorKey: "listing_id",
    header: "Listing",
    cell: ({ getValue }) => getValue() || "N/A",
  },

  reservationId: {
    accessorKey: "reservation_id",
    header: "Reservation",
    cell: ({ getValue }) => {
      const reservationId = getValue();
      if (!reservationId) return "N/A";
      return (
        <span className="reservation-id" title={reservationId}>
          {formatTruncatedId(reservationId)}
        </span>
      );
    },
  },

  scheduledDateTime: {
    accessorKey: "scheduled_datetime",
    header: "Scheduled",
    cell: ({ getValue }) => formatDateTime(getValue()),
  },

  assignedTo: {
    accessorKey: "assigned_to",
    header: "Assigned To",
    cell: ({ getValue }) => {
      const userId = getValue();
      if (!userId) return "Unassigned";
      return (
        <span className="reservation-id" title={userId}>
          {formatTruncatedId(userId)}
        </span>
      );
    },
  },

  assignedAt: {
    accessorKey: "assigned_at",
    header: "Assigned At",
    cell: ({ getValue }) => formatDateTime(getValue()),
  },

  acceptedAt: {
    accessorKey: "accepted_at",
    header: "Accepted At",
    cell: ({ getValue }) => formatDateTime(getValue()),
  },

  completedAt: {
    accessorKey: "completed_at",
    header: "Completed At",
    cell: ({ getValue }) => formatDateTime(getValue()),
  },

  createdAt: {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ getValue }) => formatDate(getValue()),
  },
});

// Create assignment dropdown column for admin view
export const createAssignmentColumn = (updateTaskAssignment) => ({
  accessorKey: "assigned_to",
  header: "Assigned To",
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
});

// Create actions column for admin view
export const createAdminActionsColumn = () => ({
  accessorKey: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const task = row.original;

    const handleView = () => {
      window.location.href = `/tasks/${task.id}`;
    };

    return (
      <div className="task-actions">
        <button
          className="btn-view"
          onClick={handleView}
        >
          View
        </button>
      </div>
    );
  },
  enableSorting: false,
});

// Create actions column for cleaner view
export const createActionsColumn = (updateTaskStatus) => ({
  accessorKey: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const task = row.original;
    const canAccept = task.status === "assigned";
    const canComplete = task.status === "accepted";
    const canCancel = task.status === "accepted";

    const handleView = () => {
      window.location.href = `/tasks/${task.id}`;
    };

    return (
      <div className="task-actions">
        <button
          className="btn-view"
          onClick={handleView}
        >
          View
        </button>
        {canAccept && (
          <button
            className="btn-accept"
            onClick={() => updateTaskStatus(task.id, "accepted")}
          >
            Accept
          </button>
        )}
        {canComplete && (
          <button
            className="btn-complete"
            onClick={() => updateTaskStatus(task.id, "completed")}
          >
            Complete
          </button>
        )}
        {canCancel && (
          <button
            className="btn-cancel"
            onClick={() => updateTaskStatus(task.id, "assigned")}
          >
            Cancel
          </button>
        )}
      </div>
    );
  },
  enableSorting: false,
});

// Pre-defined column sets
export const getAdminColumns = (updateTaskAssignment) => {
  const baseColumns = createBaseColumns();
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
};

export const getCleanerColumns = (updateTaskStatus) => {
  const baseColumns = createBaseColumns();
  return [
    baseColumns.scheduledDateTime,
    baseColumns.listingId,
    baseColumns.taskType,
    createActionsColumn(updateTaskStatus),
  ];
};
