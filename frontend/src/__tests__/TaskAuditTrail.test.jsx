import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import TaskAuditTrail from "../components/TaskAuditTrail";

// Mock the task service
const mockTaskService = {
  getTaskAuditTrail: jest.fn(),
};

const renderWithI18n = (component) => {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
};

describe("TaskAuditTrail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    mockTaskService.getTaskAuditTrail.mockResolvedValue([]);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    expect(screen.getByText("Loading audit history...")).toBeInTheDocument();
  });

  it("renders empty state when no audit entries", async () => {
    mockTaskService.getTaskAuditTrail.mockResolvedValue([]);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No audit history available for this task.")
      ).toBeInTheDocument();
    });
  });

  it("renders audit entries correctly", async () => {
    const mockAuditData = [
      {
        id: 1,
        action_type: "INSERT",
        changed_at: "2024-01-15T10:00:00Z",
        changed_by_name: "Admin User",
        changed_by_email: "admin@example.com",
        changed_fields: [],
        old_values: null,
        new_values: { id: "task-1", title: "Test Task", status: "unassigned" },
        context: { source: "web", component: "task-creation" },
      },
      {
        id: 2,
        action_type: "UPDATE",
        changed_at: "2024-01-15T11:00:00Z",
        changed_by_name: "Admin User",
        changed_by_email: "admin@example.com",
        changed_fields: ["status", "assigned_to", "assigned_at"],
        old_values: {
          status: "unassigned",
          assigned_to: null,
          assigned_at: null,
        },
        new_values: {
          status: "assigned",
          assigned_to: "cleaner-1",
          assigned_at: "2024-01-15T11:00:00Z",
        },
        context: null,
      },
    ];

    mockTaskService.getTaskAuditTrail.mockResolvedValue(mockAuditData);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(screen.getByText("INSERT")).toBeInTheDocument();
      expect(screen.getByText("UPDATE")).toBeInTheDocument();
      expect(screen.getAllByText("by Admin User")).toHaveLength(2);
    });
  });

  it("handles error state", async () => {
    mockTaskService.getTaskAuditTrail.mockRejectedValue(
      new Error("Failed to fetch audit trail")
    );

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch audit trail")
      ).toBeInTheDocument();
    });
  });

  it("displays value changes for UPDATE actions", async () => {
    const mockAuditData = [
      {
        id: 1,
        action_type: "UPDATE",
        changed_at: "2024-01-15T11:00:00Z",
        changed_by_name: "Admin User",
        changed_by_email: "admin@example.com",
        changed_fields: ["status", "assigned_to"],
        old_values: { status: "unassigned", assigned_to: null },
        new_values: { status: "assigned", assigned_to: "cleaner-1" },
        context: null,
      },
    ];

    mockTaskService.getTaskAuditTrail.mockResolvedValue(mockAuditData);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(screen.getByText("Values changed:")).toBeInTheDocument();
      expect(screen.getByText("status:")).toBeInTheDocument();
      expect(screen.getByText("assigned_to:")).toBeInTheDocument();
      expect(screen.getByText("unassigned")).toBeInTheDocument();
      expect(screen.getByText("assigned")).toBeInTheDocument();
      expect(screen.getByText("null")).toBeInTheDocument();
      expect(screen.getByText("cleaner-1")).toBeInTheDocument();
    });
  });

  it("displays context when available", async () => {
    const mockAuditData = [
      {
        id: 1,
        action_type: "INSERT",
        changed_at: "2024-01-15T10:00:00Z",
        changed_by_name: "Admin User",
        changed_by_email: "admin@example.com",
        changed_fields: [],
        old_values: null,
        new_values: { id: "task-1", title: "Test Task" },
        context: {
          source: "web",
          component: "task-creation",
          details: "admin-created",
        },
      },
    ];

    mockTaskService.getTaskAuditTrail.mockResolvedValue(mockAuditData);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(screen.getByText("Context:")).toBeInTheDocument();
      expect(screen.getByText(/"source": "web"/)).toBeInTheDocument();
      expect(
        screen.getByText(/"component": "task-creation"/)
      ).toBeInTheDocument();
    });
  });

  it("calls taskService.getTaskAuditTrail with correct taskId", async () => {
    mockTaskService.getTaskAuditTrail.mockResolvedValue([]);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(mockTaskService.getTaskAuditTrail).toHaveBeenCalledWith(
        "test-task-id"
      );
    });
  });

  it("displays user email when name is not available", async () => {
    const mockAuditData = [
      {
        id: 1,
        action_type: "INSERT",
        changed_at: "2024-01-15T10:00:00Z",
        changed_by_name: null,
        changed_by_email: "admin@example.com",
        changed_fields: [],
        old_values: null,
        new_values: { id: "task-1", title: "Test Task" },
        context: null,
      },
    ];

    mockTaskService.getTaskAuditTrail.mockResolvedValue(mockAuditData);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(screen.getByText("by admin")).toBeInTheDocument();
    });
  });

  it("displays unknown user when neither name nor email is available", async () => {
    const mockAuditData = [
      {
        id: 1,
        action_type: "INSERT",
        changed_at: "2024-01-15T10:00:00Z",
        changed_by_name: null,
        changed_by_email: null,
        changed_fields: [],
        old_values: null,
        new_values: { id: "task-1", title: "Test Task" },
        context: null,
      },
    ];

    mockTaskService.getTaskAuditTrail.mockResolvedValue(mockAuditData);

    renderWithI18n(
      <TaskAuditTrail taskId="test-task-id" taskService={mockTaskService} />
    );

    await waitFor(() => {
      expect(screen.getByText("by Unknown User")).toBeInTheDocument();
    });
  });
});
