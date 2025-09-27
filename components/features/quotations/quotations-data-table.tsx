"use client";

import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { MoreHorizontal, Eye, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useQuotations, type Quotation } from "@/lib/hooks/use-quotations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

import { QuotationsTableToolbar } from "./quotations-table-toolbar";
import { QuotationViewModal } from "./quotation-view-modal";
import { QuotationStatusDialog } from "./quotation-status-dialog";

// Status badge variant mapping
const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toLowerCase()) {
    case "approved":
      return "default";
    case "pending":
      return "outline";
    case "negotiation":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

// Status display mapping in Vietnamese
const getStatusDisplay = (status: string): string => {
  switch (status.toLowerCase()) {
    case "pending":
      return "Chờ Duyệt";
    case "approved":
      return "Đã Duyệt";
    case "negotiation":
      return "Đang Thương Lượng";
    case "cancelled":
      return "Đã Hủy";
    default:
      return status;
  }
};

// Date formatting helper
const formatDate = (date: Date | string | null): string => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// Period formatting helper (YYYY-MM-DD -> readable format)
const formatPeriod = (period: string): string => {
  try {
    const [year, month, day] = period.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return period;
  }
};

export function QuotationsDataTable() {
  // Modal states - CENTRALIZED STATE MANAGEMENT with key-based reset pattern
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Fetch quotation data using our custom hook
  const {
    quotations,
    pagination,
    isLoading,
    error,
    isEmpty,
    refresh,
    urlState,
    setSearch,
    setFilter,
    setSort,
    setPagination,
    clearFilters,
    hasActiveFilters,
    hasActiveFiltersOnly,
  } = useQuotations();

  // Convert our URL sort state to TanStack Table sorting format
  const sorting: SortingState = useMemo(() => {
    if (urlState.sort.column && urlState.sort.order) {
      return [
        { id: urlState.sort.column, desc: urlState.sort.order === "desc" },
      ];
    }
    return [];
  }, [urlState.sort.column, urlState.sort.order]);

  // Handle TanStack Table sorting changes and sync with URL state
  const handleSortingChange = (updater: any) => {
    const newSorting =
      typeof updater === "function" ? updater(sorting) : updater;

    if (newSorting.length === 0) {
      // No sorting - clear sort from URL
      setSort("");
    } else {
      // Extract the first sort (single column sorting)
      const { id } = newSorting[0];
      setSort(id);
    }
  };

  // Event handlers - CENTRALIZED pattern
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handlePeriodChange = (value: string) => {
    setFilter("period", value === "all" ? null : value);
  };

  const handleSupplierChange = (value: string) => {
    setFilter("supplier", value === "all" ? null : value);
  };

  const handleRegionChange = (value: string) => {
    setFilter("region", value === "all" ? null : value);
  };

  const handleTeamChange = (value: string) => {
    setFilter("teamId", value === "all" ? null : value);
  };

  const handleStatusChange = (value: string) => {
    setFilter("status", value === "all" ? null : value);
  };

  const handlePageChange = (page: number) => {
    setPagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ limit: pageSize, page: 1 });
  };

  // Modal handlers - CENTRALIZED pattern
  const handleViewClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsViewModalOpen(true);
  };

  const handleStatusClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsStatusModalOpen(true);
  };

  // Modal close handlers - CENTRALIZED pattern
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedQuotation(null);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
    setSelectedQuotation(null);
  };

  // Success handlers that refresh data and close modals
  const handleModalSuccess = () => {
    refresh();
  };

  // Table column definitions - ALL 10 COLUMNS FROM WIREFRAME
  const columns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "quotationId",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Quotation ID" column={column} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("quotationId")}</div>
      ),
    },
    {
      accessorKey: "period",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Kỳ báo giá" column={column} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {formatPeriod(row.getValue("period"))}
        </div>
      ),
    },
    {
      accessorKey: "supplierCode",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Supplier ID" column={column} />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("supplierCode") || "-"}</div>
      ),
    },
    {
      accessorKey: "supplierName",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Tên nhà cung cấp" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("supplierName") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "region",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Khu vực" column={column} />
      ),
      cell: ({ row }) => <div>{row.getValue("region")}</div>,
    },
    {
      accessorKey: "category",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Nhóm hàng" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate">{row.getValue("category")}</div>
      ),
    },
    {
      accessorKey: "quoteDate",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Ngày báo giá" column={column} />
      ),
      cell: ({ row }) => (
        <div>{formatDate(row.getValue("quoteDate"))}</div>
      ),
    },
    {
      accessorKey: "updateDate",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Ngày cập nhật" column={column} />
      ),
      cell: ({ row }) => (
        <div>{formatDate(row.getValue("updateDate"))}</div>
      ),
    },
    {
      accessorKey: "status",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Trạng thái" column={column} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusDisplay(status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-center">Thao tác</div>,
      cell: ({ row }) => {
        const quotation = row.original;

        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Mở menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleViewClick(quotation)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {quotation.status === "pending" && (
                  <DropdownMenuItem onClick={() => handleStatusClick(quotation)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Duyệt báo giá
                  </DropdownMenuItem>
                )}
                {quotation.status !== "cancelled" && (
                  <DropdownMenuItem
                    onClick={() => handleStatusClick(quotation)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Hủy báo giá
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Configure TanStack Table for manual server-side operations
  const table = useReactTable({
    data: quotations,
    columns,
    getCoreRowModel: getCoreRowModel(),

    // Manual server-side operations
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,

    // Sorting state management
    state: {
      sorting,
    },
    onSortingChange: handleSortingChange,

    // Pagination state (handled via URL state)
    pageCount: pagination?.pages || 0,

    // Default column visibility
    initialState: {
      columnVisibility: {
        // All columns visible by default for quotations
      },
    },
  });

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu báo giá</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={refresh} variant="outline">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <QuotationsTableToolbar
        searchValue={urlState.filters.search || ""}
        onSearchChange={handleSearchChange}
        selectedPeriod={urlState.filters.period || "all"}
        onPeriodChange={handlePeriodChange}
        selectedSupplier={urlState.filters.supplier || "all"}
        onSupplierChange={handleSupplierChange}
        selectedRegion={urlState.filters.region || "all"}
        onRegionChange={handleRegionChange}
        selectedTeam={urlState.filters.teamId || "all"}
        onTeamChange={handleTeamChange}
        selectedStatus={urlState.filters.status || "all"}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        hasActiveFiltersOnly={hasActiveFiltersOnly}
        table={table}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isEmpty
                    ? "Không có dữ liệu báo giá."
                    : "Không tìm thấy kết quả."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Modal Components - KEY-BASED RESET PATTERN (MANDATORY) */}
      <QuotationViewModal
        key={selectedQuotation ? `view-modal-${selectedQuotation.id}` : "view-modal-empty"}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        quotation={selectedQuotation}
      />

      <QuotationStatusDialog
        key={selectedQuotation ? `status-modal-${selectedQuotation.id}` : "status-modal-empty"}
        isOpen={isStatusModalOpen}
        onClose={handleCloseStatusModal}
        onSuccess={handleModalSuccess}
        quotation={selectedQuotation}
      />
    </div>
  );
}