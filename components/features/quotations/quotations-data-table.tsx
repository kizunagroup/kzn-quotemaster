"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, GitCompare, MoreHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  getQuotations,
  getAvailablePeriods,
  getAvailableSuppliers,
  cancelQuotation,
  getCurrentUserPermissions,
  type QuotationWithDetails,
} from "@/lib/actions/quotations.actions";
import { type PermissionSet } from "@/lib/auth/permissions";
import { ImportExcelModal } from "./import-excel-modal";
import { QuoteDetailsModal } from "./quote-details-modal";
import { QuotationsTableToolbar } from "./quotations-table-toolbar";

// Status badge styling
const statusConfig = {
  pending: { label: "Chờ duyệt", variant: "secondary" as const },
  negotiation: { label: "Đàm phán", variant: "default" as const },
  approved: { label: "Đã duyệt", variant: "default" as const },
  cancelled: { label: "Đã hủy", variant: "destructive" as const },
};

// Hook for managing quotations data and state
function useQuotations() {
  const [data, setData] = React.useState<QuotationWithDetails[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [permissions, setPermissions] = React.useState<PermissionSet | null>(null);

  // Filters
  const [period, setPeriod] = React.useState<string>("");
  const [region, setRegion] = React.useState<string>("");
  const [supplierId, setSupplierId] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("");

  // Helper data
  const [availablePeriods, setAvailablePeriods] = React.useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = React.useState<Array<{ id: number; code: string; name: string }>>([]);

  // Fetch quotations data
  const fetchQuotations = React.useCallback(async () => {
    try {
      setLoading(true);
      const filters = {
        period: period || undefined,
        region: region || undefined,
        supplierId: supplierId ? parseInt(supplierId) : undefined,
        status: status || undefined,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      const result = await getQuotations(filters);
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast.error("Lỗi khi tải danh sách báo giá");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, region, supplierId, status, pagination.pageIndex, pagination.pageSize]);

  // Fetch helper data
  const fetchHelperData = React.useCallback(async () => {
    try {
      const [periods, suppliers, permissionsResult] = await Promise.all([
        getAvailablePeriods(),
        getAvailableSuppliers(),
        getCurrentUserPermissions(),
      ]);
      setAvailablePeriods(periods);
      setAvailableSuppliers(suppliers);

      // Load user permissions
      if (permissionsResult.success && permissionsResult.permissions) {
        setPermissions(permissionsResult.permissions);
      } else {
        console.error("Failed to load permissions:", permissionsResult.error);
        // Set default restrictive permissions
        setPermissions({
          canViewQuotes: false,
          canCreateQuotes: false,
          canApproveQuotes: false,
          canNegotiateQuotes: false,
          canManageProducts: false,
          canManageSuppliers: false,
          canManageKitchens: false,
          canManageStaff: false,
          canViewAnalytics: false,
          canExportData: false,
          teamRestricted: true,
        });
      }
    } catch (error) {
      console.error("Error fetching helper data:", error);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchHelperData();
  }, [fetchHelperData]);

  // Fetch quotations when filters or pagination change
  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  return {
    data,
    loading,
    pagination,
    setPagination,
    totalPages,
    totalCount,
    permissions,
    // Filters
    period,
    setPeriod,
    region,
    setRegion,
    supplierId,
    setSupplierId,
    status,
    setStatus,
    // Helper data
    availablePeriods,
    availableSuppliers,
    // Actions
    refetch: fetchQuotations,
  };
}

// Table columns definition
const createColumns = (
  permissions: PermissionSet | null,
  onViewDetails: (quotation: QuotationWithDetails) => void
): ColumnDef<QuotationWithDetails>[] => [
  {
    accessorKey: "period",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Kỳ báo giá
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("period")}</div>
    ),
  },
  {
    accessorKey: "region",
    header: "Khu vực",
    cell: ({ row }) => (
      <div className="max-w-[100px] truncate">{row.getValue("region")}</div>
    ),
  },
  {
    accessorKey: "supplier.supplierCode",
    header: "Mã NCC",
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.original.supplier?.supplierCode}</div>
    ),
  },
  {
    accessorKey: "supplier.name",
    header: "Tên NCC",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.supplier?.name}>
        {row.original.supplier?.name}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const status = row.getValue("status") as keyof typeof statusConfig;
      const config = statusConfig[status] || statusConfig.pending;

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "itemCount",
    header: "Số SP",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("itemCount")}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Ngày tạo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-sm">
        {new Date(row.getValue("createdAt")).toLocaleDateString("vi-VN")}
      </div>
    ),
  },
  {
    accessorKey: "creator.name",
    header: "Người tạo",
    cell: ({ row }) => (
      <div className="max-w-[120px] truncate">
        {row.original.creator?.name || "N/A"}
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const quotation = row.original;

      return <QuotationActions quotation={quotation} permissions={permissions} onViewDetails={onViewDetails} />;
    },
  },
];

// Actions dropdown for each quotation row
function QuotationActions({
  quotation,
  permissions,
  onViewDetails
}: {
  quotation: QuotationWithDetails;
  permissions: PermissionSet | null;
  onViewDetails: (quotation: QuotationWithDetails) => void;
}) {
  const router = useRouter();

  const handleViewDetails = () => {
    onViewDetails(quotation);
  };

  const handleCompare = () => {
    // Navigate to comparison page with pre-filled filters
    const params = new URLSearchParams({
      period: quotation.period,
      region: quotation.region,
    });
    router.push(`/so-sanh?${params.toString()}`);
  };

  const handleCancel = async () => {
    if (confirm("Bạn có chắc chắn muốn hủy báo giá này?")) {
      try {
        await cancelQuotation(quotation.id);
        toast.success("Đã hủy báo giá thành công");
        // Parent component will refresh data
      } catch (error) {
        console.error("Error cancelling quotation:", error);
        toast.error("Lỗi khi hủy báo giá");
      }
    }
  };

  // Permission checks
  const canViewDetails = permissions?.canViewQuotes ?? false;
  const canCancel = (permissions?.canApproveQuotes ?? false) &&
                   (quotation.status === "pending" || quotation.status === "negotiation");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Mở menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
          {canViewDetails && (
            <DropdownMenuItem onClick={handleViewDetails}>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
          )}
          {canViewDetails && (
            <DropdownMenuItem onClick={handleCompare}>
              <GitCompare className="mr-2 h-4 w-4" />
              So sánh
            </DropdownMenuItem>
          )}
          {canViewDetails && canCancel && <DropdownMenuSeparator />}
          {canCancel && (
            <DropdownMenuItem onClick={handleCancel} className="text-destructive">
              <X className="mr-2 h-4 w-4" />
              Hủy báo giá
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}


// Main data table component
export function QuotationsDataTable() {
  const {
    data,
    loading,
    pagination,
    setPagination,
    totalPages,
    totalCount,
    permissions,
    period,
    setPeriod,
    region,
    setRegion,
    supplierId,
    setSupplierId,
    status,
    setStatus,
    availablePeriods,
    availableSuppliers,
    refetch,
  } = useQuotations();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Modal states - CENTRALIZED STATE MANAGEMENT like Suppliers
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [selectedQuotation, setSelectedQuotation] = React.useState<QuotationWithDetails | null>(null);

  // Modal handlers - CENTRALIZED like Suppliers pattern (MOVED BEFORE columns definition)
  const handleViewDetailsClick = (quotation: QuotationWithDetails) => {
    setSelectedQuotation(quotation);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedQuotation(null);
  };

  const handleClearFilters = () => {
    setPeriod("");
    setRegion("");
    setSupplierId("");
    setStatus("");
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    refetch();
    toast.success("Import báo giá thành công");
  };

  const columns = React.useMemo(() => createColumns(permissions, handleViewDetailsClick), [permissions, handleViewDetailsClick]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  // Check permissions first
  if (permissions && !permissions.canViewQuotes) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <h3 className="mt-4 text-lg font-semibold">Không có quyền truy cập</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Bạn không có quyền xem báo giá. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = period || region || supplierId || status;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <QuotationsTableToolbar
        onSearchChange={() => {}} // No search in quotations
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        selectedSupplier={supplierId}
        onSupplierChange={setSupplierId}
        selectedRegion={region}
        onRegionChange={setRegion}
        selectedStatus={status}
        onStatusChange={setStatus}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        table={table}
        onImportClick={() => setShowImportModal(true)}
        availablePeriods={availablePeriods}
        availableSuppliers={availableSuppliers}
      />

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
                  {loading ? "Đang tải..." : "Không có kết quả."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />

      {/* Import Modal */}
      <ImportExcelModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={handleImportSuccess}
      />

      {/* Details Modal - CENTRALIZED like Suppliers pattern */}
      <QuoteDetailsModal
        quotationId={selectedQuotation?.id || null}
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetailsModal();
          }
        }}
      />
    </div>
  );
}