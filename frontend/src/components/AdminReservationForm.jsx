import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import DataTable from "./DataTable";

export default function AdminReservationForm() {
  const { supabase } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Table state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([{ id: "check_in", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    fetchReservations();
  }, [pagination, sorting, globalFilter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase.from("reservations").select("*", { count: "exact" });

      // Apply global filter (search across multiple columns)
      if (globalFilter) {
        query = query.or(
          `guest_name.ilike.%${globalFilter}%,property_name.ilike.%${globalFilter}%,status.ilike.%${globalFilter}%`
        );
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setReservations(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching reservations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle server-side table state changes
  const handleServerSideChange = (newState) => {
    if (newState.pagination) {
      setPagination(newState.pagination);
    }
    if (newState.sorting !== undefined) {
      setSorting(newState.sorting);
    }
    if (newState.globalFilter !== undefined) {
      setGlobalFilter(newState.globalFilter);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ getValue }) => {
          const id = getValue();
          return (
            <span className="reservation-id" title={id}>
              {id.substring(0, 8)}...
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "guest_name",
        header: "Guest",
        cell: ({ getValue }) => getValue() || "N/A",
      },
      {
        accessorKey: "property_name",
        header: "Property",
        cell: ({ getValue }) => getValue() || "N/A",
      },
      {
        accessorKey: "check_in",
        header: "Check-in",
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: "check_out",
        header: "Check-out",
        cell: ({ getValue }) => formatDate(getValue()),
      },
      {
        accessorKey: "nights",
        header: "Nights",
        cell: ({ getValue }) => getValue() || "N/A",
      },
      {
        accessorKey: "party_size",
        header: "Guests",
        cell: ({ getValue }) => getValue() || "N/A",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <span className={`status-badge status-${status}`}>{status}</span>
          );
        },
      },
      {
        accessorKey: "pricing_guest_total",
        header: "Total",
        cell: ({ getValue }) => (
          <span className="currency">{formatCurrency(getValue())}</span>
        ),
      },
      {
        accessorKey: "pricing_host_payout",
        header: "Host Payout",
        cell: ({ getValue }) => (
          <span className="currency">{formatCurrency(getValue())}</span>
        ),
      },
    ],
    [formatDate, formatCurrency]
  );

  return (
    <div className="admin-reservations">
      <DataTable
        data={reservations}
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
        className="reservations-data-table"
      />
    </div>
  );
}
