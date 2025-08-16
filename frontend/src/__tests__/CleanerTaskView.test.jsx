import { render, screen } from "@testing-library/react";
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import CleanerTaskView from "../components/CleanerTaskView";
import { FrontendTestHelper } from "./test-utils";

// Mock the hooks and components
const mockUseAuth = jest.fn();
const mockUseTaskTable = jest.fn();
const mockDataTable = jest.fn();
const mockGetCleanerColumns = jest.fn();

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../hooks/useTaskTable", () => ({
  useTaskTable: (filterByUser) => mockUseTaskTable(filterByUser),
}));

jest.mock("../components/DataTable", () => {
  return function MockDataTable(props) {
    mockDataTable(props);
    return <div data-testid="data-table">Mock Data Table</div>;
  };
});

jest.mock("../hooks/useTranslatedColumns.jsx", () => ({
  useTranslatedColumns: () => ({
    getCleanerColumns: (callback) => mockGetCleanerColumns(callback),
  }),
}));

describe("CleanerTaskView", () => {
  let testHelper;
  const mockUpdateTaskStatus = jest.fn();
  const mockHandleServerSideChange = jest.fn();

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
    const mockUser = FrontendTestHelper.createMockUser({
      email: "cleaner@example.com",
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockUseTaskTable.mockReturnValue({
      tasks: [
        { id: 1, title: "Clean Room 101", status: "pending" },
        { id: 2, title: "Clean Room 102", status: "completed" },
      ],
      loading: false,
      error: null,
      totalCount: 2,
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [],
      globalFilter: "",
      handleServerSideChange: mockHandleServerSideChange,
      updateTaskStatus: mockUpdateTaskStatus,
    });

    mockGetCleanerColumns.mockReturnValue([
      { accessorKey: "title", header: "Title", cell: jest.fn() },
      { accessorKey: "status", header: "Status", cell: jest.fn() },
    ]);

    mockDataTable.mockClear();
    mockGetCleanerColumns.mockClear();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("renders cleaner task view with header and data table", () => {
    render(<CleanerTaskView />);

    expect(screen.getByText("My Tasks")).toBeInTheDocument();
    expect(screen.getByText("Total Tasks: 2")).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  test("shows loading state correctly", () => {
    mockUseTaskTable.mockReturnValue({
      tasks: [],
      loading: true,
      error: null,
      totalCount: 0,
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [],
      globalFilter: "",
      handleServerSideChange: mockHandleServerSideChange,
      updateTaskStatus: mockUpdateTaskStatus,
    });

    render(<CleanerTaskView />);

    expect(screen.getByText("My Tasks")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("shows login prompt when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
    });

    render(<CleanerTaskView />);

    expect(
      screen.getByText("Please log in to view your tasks.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  test("passes correct props to DataTable", () => {
    const mockTasks = [{ id: 1, title: "Test Task", status: "pending" }];
    const mockColumns = [
      { accessorKey: "title", header: "Title", cell: jest.fn() },
    ];

    mockUseTaskTable.mockReturnValue({
      tasks: mockTasks,
      loading: false,
      error: null,
      totalCount: 1,
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [],
      globalFilter: "",
      handleServerSideChange: mockHandleServerSideChange,
      updateTaskStatus: mockUpdateTaskStatus,
    });
    mockGetCleanerColumns.mockReturnValue(mockColumns);

    render(<CleanerTaskView />);

    expect(mockDataTable).toHaveBeenCalledWith({
      data: mockTasks,
      columns: mockColumns,
      loading: false,
      error: null,
      serverSide: true,
      onServerSideChange: mockHandleServerSideChange,
      totalCount: 1,
      pageSize: 10,
      pageIndex: 0,
      sorting: [],
      globalFilter: "",
      className: "cleaner-tasks-data-table",
    });
  });

  test("initializes useTaskTable with correct parameters", () => {
    render(<CleanerTaskView />);

    expect(mockUseTaskTable).toHaveBeenCalledWith(true);
  });

  test("passes updateTaskStatus to column factory", () => {
    render(<CleanerTaskView />);

    expect(mockGetCleanerColumns).toHaveBeenCalledWith(mockUpdateTaskStatus);
  });
});
