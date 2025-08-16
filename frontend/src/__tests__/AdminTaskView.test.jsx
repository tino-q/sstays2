import { render, screen } from "@testing-library/react";
import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import AdminTaskView from "../components/AdminTaskView";
import { FrontendTestHelper } from "./test-utils";

// Mock the hooks and components
const mockUseTaskTable = jest.fn();
const mockDataTable = jest.fn();
const mockGetAdminColumns = jest.fn();

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
    getAdminColumns: (callback) => mockGetAdminColumns(callback),
  }),
}));

describe("AdminTaskView", () => {
  let testHelper;
  const mockUpdateTaskAssignment = jest.fn();
  const mockHandleServerSideChange = jest.fn();

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
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
      updateTaskAssignment: mockUpdateTaskAssignment,
    });
    mockGetAdminColumns.mockReturnValue([
      { accessorKey: "title", header: "Title", cell: jest.fn() },
      { accessorKey: "status", header: "Status", cell: jest.fn() },
    ]);
    mockDataTable.mockClear();
    mockGetAdminColumns.mockClear();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("renders admin task view with header and data table", () => {
    render(<AdminTaskView />);

    expect(screen.getByText("Task Management")).toBeInTheDocument();
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
      updateTaskAssignment: mockUpdateTaskAssignment,
    });

    render(<AdminTaskView />);

    expect(screen.getByText("Task Management")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
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
      updateTaskAssignment: mockUpdateTaskAssignment,
    });
    mockGetAdminColumns.mockReturnValue(mockColumns);

    render(<AdminTaskView />);

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
      className: "tasks-data-table",
    });
  });

  test("initializes useTaskTable with correct parameters", () => {
    render(<AdminTaskView />);

    expect(mockUseTaskTable).toHaveBeenCalledWith(false);
  });

  test("passes updateTaskAssignment to column factory", () => {
    render(<AdminTaskView />);

    expect(mockGetAdminColumns).toHaveBeenCalledWith(mockUpdateTaskAssignment);
  });
});
