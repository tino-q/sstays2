import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import DataTable from "../components/DataTable";
import { FrontendTestHelper } from "./test-utils";

describe("DataTable", () => {
  let testHelper;
  const mockOnServerSideChange = jest.fn();

  const defaultProps = {
    data: [
      { id: 1, name: "Task 1", status: "pending" },
      { id: 2, name: "Task 2", status: "completed" },
    ],
    columns: [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "status", 
        header: "Status",
      },
    ],
    loading: false,
    error: null,
  };

  beforeEach(() => {
    testHelper = new FrontendTestHelper();
    mockOnServerSideChange.mockClear();
  });

  afterEach(() => {
    testHelper.cleanup();
  });

  test("renders data table with provided data", () => {
    render(<DataTable {...defaultProps} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  test("shows loading state", () => {
    render(<DataTable {...defaultProps} loading={true} />);

    expect(screen.getByText("Loading data...")).toBeInTheDocument();
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
  });

  test("shows error state", () => {
    const error = "Failed to load data";
    render(<DataTable {...defaultProps} error={error} />);

    expect(screen.getByText("Failed to Load Data")).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
  });

  test("shows empty state when no data", () => {
    render(<DataTable {...defaultProps} data={[]} />);

    expect(screen.getByText("No Data Found")).toBeInTheDocument();
    expect(screen.getByText("No data available.")).toBeInTheDocument();
  });

  test("shows empty state with filter message when filtered", () => {
    render(<DataTable {...defaultProps} data={[]} globalFilter="test" />);

    expect(screen.getByText("No Data Found")).toBeInTheDocument();
    expect(screen.getByText("No results match your search criteria.")).toBeInTheDocument();
  });

  test("handles global filter input", async () => {
    render(<DataTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search all columns...");
    fireEvent.change(searchInput, { target: { value: "Task 1" } });

    await waitFor(() => {
      expect(searchInput.value).toBe("Task 1");
    });
  });

  test("calls onServerSideChange when server-side and filter changes", async () => {
    render(
      <DataTable
        {...defaultProps}
        serverSide={true}
        onServerSideChange={mockOnServerSideChange}
        totalCount={10}
        pageSize={5}
        pageIndex={0}
        sorting={[]}
        globalFilter=""
      />
    );

    const searchInput = screen.getByPlaceholderText("Search all columns...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    await waitFor(() => {
      expect(mockOnServerSideChange).toHaveBeenCalledWith({
        sorting: [],
        pagination: { pageIndex: 0, pageSize: 5 },
        globalFilter: "test",
      });
    });
  });

  test("shows pagination controls when enabled", () => {
    render(<DataTable {...defaultProps} enablePagination={true} />);

    expect(screen.getByText("⟪")).toBeInTheDocument(); // First page
    expect(screen.getByText("⟨")).toBeInTheDocument(); // Previous page
    expect(screen.getByText("⟩")).toBeInTheDocument(); // Next page
    expect(screen.getByText("⟫")).toBeInTheDocument(); // Last page
    expect(screen.getByText("Show 10")).toBeInTheDocument(); // Page size selector option
  });

  test("hides pagination controls when disabled", () => {
    render(<DataTable {...defaultProps} enablePagination={false} />);

    expect(screen.queryByText("⟪")).not.toBeInTheDocument();
    expect(screen.queryByText("⟨")).not.toBeInTheDocument();
    expect(screen.queryByText("⟩")).not.toBeInTheDocument();
    expect(screen.queryByText("⟫")).not.toBeInTheDocument();
  });

  test("shows correct table stats for client-side table", () => {
    render(<DataTable {...defaultProps} />);

    expect(screen.getByText("Showing 2 of 2 entries")).toBeInTheDocument();
  });

  test("shows correct table stats for server-side table", () => {
    render(
      <DataTable
        {...defaultProps}
        serverSide={true}
        totalCount={100}
        pageSize={10}
        pageIndex={0}
      />
    );

    expect(screen.getByText("Showing 1 to 10 of 100 entries")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const { container } = render(<DataTable {...defaultProps} className="custom-table" />);

    expect(container.querySelector(".data-table.custom-table")).toBeInTheDocument();
  });

  test("handles page size changes", async () => {
    render(<DataTable {...defaultProps} enablePagination={true} />);

    const pageSizeSelect = screen.getByRole("combobox");
    fireEvent.change(pageSizeSelect, { target: { value: "25" } });

    await waitFor(() => {
      expect(pageSizeSelect.value).toBe("25");
    });
  });

  test("handles pagination button clicks", () => {
    const longData = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Task ${i + 1}`,
      status: "pending",
    }));

    render(<DataTable {...defaultProps} data={longData} enablePagination={true} />);

    const nextPageButton = screen.getByText("⟩");
    fireEvent.click(nextPageButton);

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});