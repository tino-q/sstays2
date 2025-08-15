import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

const DataTable = ({ 
  data = [], 
  columns = [], 
  loading = false, 
  error = null,
  enablePagination = true,
  serverSide = false,
  onServerSideChange,
  totalCount = 0,
  pageSize: initialPageSize = 10,
  pageIndex: initialPageIndex = 0,
  sorting: initialSorting = [],
  globalFilter: initialGlobalFilter = '',
  className = ''
}) => {
  // Local state for client-side features
  const [sorting, setSorting] = useState(initialSorting);
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  // Handle server-side updates
  const handleServerSideUpdate = (updatedState) => {
    if (serverSide && onServerSideChange) {
      onServerSideChange(updatedState);
    }
  };

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    
    // State
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    
    // Event handlers
    onSortingChange: (updaterOrValue) => {
      const newSorting = typeof updaterOrValue === 'function' 
        ? updaterOrValue(sorting) 
        : updaterOrValue;
      setSorting(newSorting);
      
      if (serverSide) {
        handleServerSideUpdate({
          sorting: newSorting,
          pagination,
          globalFilter,
        });
      }
    },
    
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      
      if (serverSide) {
        // Reset to first page when filtering
        const newPagination = { ...pagination, pageIndex: 0 };
        setPagination(newPagination);
        
        handleServerSideUpdate({
          sorting,
          pagination: newPagination,
          globalFilter: value,
        });
      }
    },
    
    onPaginationChange: (updaterOrValue) => {
      const newPagination = typeof updaterOrValue === 'function' 
        ? updaterOrValue(pagination) 
        : updaterOrValue;
      setPagination(newPagination);
      
      if (serverSide) {
        handleServerSideUpdate({
          sorting,
          pagination: newPagination,
          globalFilter,
        });
      }
    },
    
    // Server-side configuration
    manualSorting: serverSide,
    manualFiltering: serverSide,
    manualPagination: serverSide,
    
    // Row count for server-side pagination
    rowCount: serverSide ? totalCount : undefined,
  });

  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="loading-spinner"></div>
        Loading data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h3 className="error-title">Failed to Load Data</h3>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className={`data-table ${className}`}>
      {/* Search/Filter Controls */}
      <div className="data-table-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="table-info">
          {serverSide ? (
            <span className="table-stats">
              Showing {Math.min(pagination.pageIndex * pagination.pageSize + 1, totalCount)} to{' '}
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} of{' '}
              {totalCount} entries
            </span>
          ) : (
            <span className="table-stats">
              Showing {table.getRowModel().rows.length} of {data.length} entries
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table-element">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="data-table-header">
                    {header.isPlaceholder ? null : (
                      <div
                        className={`header-content ${
                          header.column.getCanSort() ? 'sortable' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="sort-indicator">
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted()] ?? ' ↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3 className="empty-state-title">No Data Found</h3>
                    <p className="empty-state-description">
                      {globalFilter ? 'No results match your search criteria.' : 'No data available.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="data-table-row">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="data-table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && (
        <div className="pagination-controls">
          <div className="pagination-info">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
          </div>
          
          <div className="pagination-buttons">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn"
            >
              ⟪
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="pagination-btn"
            >
              ⟨
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="pagination-btn"
            >
              ⟩
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="pagination-btn"
            >
              ⟫
            </button>
          </div>
          
          <div className="page-size-selector">
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="page-size-select"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>
                  Show {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;