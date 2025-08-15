import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { useTaskTable } from "../hooks/useTaskTable";
import { FrontendTestHelper } from "./test-utils";

// Mock the auth context
const mockSupabaseClient = {
  from: jest.fn(),
};

const mockAuthContext = {
  supabase: mockSupabaseClient,
  user: { id: "test-user-id" },
};

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockAuthContext,
}));

describe("useTaskTable", () => {
  let testHelper;
  const mockSelect = jest.fn();
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();

  beforeEach(() => {
    testHelper = new FrontendTestHelper();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default chain for queries
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
      or: mockEq,
      order: mockEq,
      range: mockEq,
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });
  });

  afterEach(() => {
    testHelper.cleanup();
  });

    test("updateTaskAssignment only updates assignment fields (status handled by DB trigger)", async () => {
    const { result } = renderHook(() => useTaskTable());
 
    // Setup the mock to return success
    mockEq.mockResolvedValueOnce({ error: null });
 
    await act(async () => {
      await result.current.updateTaskAssignment("task-123", "user-456");
    });

    // Verify the update was called with correct parameters (no status field)
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("tasks");
    expect(mockUpdate).toHaveBeenCalledWith({
      assigned_to: "user-456",
      assigned_at: expect.any(String), // ISO timestamp
    });
    expect(mockEq).toHaveBeenCalledWith("id", "task-123");
  });

    test("updateTaskAssignment handles unassignment correctly (status handled by DB trigger)", async () => {
    const { result } = renderHook(() => useTaskTable());
 
    // Setup the mock to return success
    mockEq.mockResolvedValueOnce({ error: null });
 
    await act(async () => {
      await result.current.updateTaskAssignment("task-123", null);
    });

    // Verify the update was called with correct parameters (no status field)
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("tasks");
    expect(mockUpdate).toHaveBeenCalledWith({
      assigned_to: null,
      assigned_at: null,
    });
    expect(mockEq).toHaveBeenCalledWith("id", "task-123");
  });

  test("updateTaskAssignment handles database errors correctly", async () => {
    const { result } = renderHook(() => useTaskTable());

    // Setup the mock to return an error
    const mockError = new Error("Database connection failed");
    mockEq.mockResolvedValueOnce({ error: mockError });

    // The function should throw the error
    await act(async () => {
      await expect(
        result.current.updateTaskAssignment("task-123", "user-456")
      ).rejects.toThrow("Database connection failed");
    });

    // Verify the update was attempted (no status field)
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("tasks");
    expect(mockUpdate).toHaveBeenCalledWith({
      assigned_to: "user-456",
      assigned_at: expect.any(String),
    });
  });

  test("updateTaskStatus preserves existing functionality", async () => {
    const { result } = renderHook(() => useTaskTable());

    // Setup the mock to return success
    mockEq.mockResolvedValueOnce({ error: null });

    await act(async () => {
      await result.current.updateTaskStatus("task-123", "completed");
    });

    // Verify the update was called with correct parameters
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("tasks");
    expect(mockUpdate).toHaveBeenCalledWith({
      status: "completed",
      completed_at: expect.any(String),
    });
    expect(mockEq).toHaveBeenCalledWith("id", "task-123");
  });
});
