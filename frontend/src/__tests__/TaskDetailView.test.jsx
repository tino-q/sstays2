import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TaskDetailView from "../components/TaskDetailView";

// Mock the useAuth hook
jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// Mock useParams
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ id: "test-task-id" }),
  useNavigate: () => jest.fn(),
}));

import { useAuth } from "../contexts/AuthContext";

const mockTask = {
  id: "test-task-id",
  title: "Test Cleaning Task",
  task_type: "cleaning",
  status: "assigned",
  description: "Test task description",
  listing_id: "listing-123",
  reservation_id: "reservation-456",
  scheduled_datetime: "2024-01-15T10:00:00Z",
  assigned_to: "user-123",
  assigned_at: "2024-01-14T09:00:00Z",
  accepted_at: null,
  completed_at: null,
  created_at: "2024-01-14T08:00:00Z",
};

const renderWithProviders = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("TaskDetailView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Mock useAuth to return a simple supabase mock
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);
    expect(screen.getByText("Loading task details...")).toBeInTheDocument();
  });

  it("renders task details when data is loaded", async () => {
    // Create a simpler mock that returns the task data
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockTask,
      error: null,
    });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);

    // Wait for the component to load and show task details
    await waitFor(
      () => {
        expect(screen.getByText("Task Details")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify the task data is displayed
    expect(screen.getByText("Test Cleaning Task")).toBeInTheDocument();
    expect(screen.getByText("assigned")).toBeInTheDocument();

    // Verify helper buttons are present (only start button since accepted_at is null)
    expect(screen.getByText("Set Start Time")).toBeInTheDocument();
    expect(screen.queryByText("Set Finish Time")).not.toBeInTheDocument();
  });

  it("shows helper buttons for task actions", async () => {
    const taskWithBothButtons = {
      ...mockTask,
      accepted_at: "2024-01-15T10:00:00Z",
      completed_at: null,
    };
    const mockSingle = jest.fn().mockResolvedValue({
      data: taskWithBothButtons,
      error: null,
    });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);

    await waitFor(() => {
      expect(screen.queryByText("Set Start Time")).not.toBeInTheDocument();
      expect(screen.getByText("Set Finish Time")).toBeInTheDocument();
    });
  });

  it("shows only start button when task is not started", async () => {
    const taskNotStarted = {
      ...mockTask,
      accepted_at: null,
      completed_at: null,
    };
    const mockSingle = jest.fn().mockResolvedValue({
      data: taskNotStarted,
      error: null,
    });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);

    await waitFor(() => {
      expect(screen.getByText("Set Start Time")).toBeInTheDocument();
      expect(screen.queryByText("Set Finish Time")).not.toBeInTheDocument();
    });
  });

  it("shows only finish button when task is started but not completed", async () => {
    const taskStarted = {
      ...mockTask,
      accepted_at: "2024-01-15T10:00:00Z",
      completed_at: null,
    };
    const mockSingle = jest.fn().mockResolvedValue({
      data: taskStarted,
      error: null,
    });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);

    await waitFor(() => {
      expect(screen.queryByText("Set Start Time")).not.toBeInTheDocument();
      expect(screen.getByText("Set Finish Time")).toBeInTheDocument();
    });
  });

  it("shows no buttons when task is completed", async () => {
    const taskCompleted = {
      ...mockTask,
      accepted_at: "2024-01-15T10:00:00Z",
      completed_at: "2024-01-15T12:00:00Z",
    };
    const mockSingle = jest.fn().mockResolvedValue({
      data: taskCompleted,
      error: null,
    });

    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };

    useAuth.mockReturnValue({
      supabase: mockSupabase,
      user: { id: "test-user-id", email: "test@example.com" },
    });

    renderWithProviders(<TaskDetailView />);

    await waitFor(() => {
      expect(screen.queryByText("Set Start Time")).not.toBeInTheDocument();
      expect(screen.queryByText("Set Finish Time")).not.toBeInTheDocument();
    });
  });
});
