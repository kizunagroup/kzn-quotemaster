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
import { ArrowUpDown, ChevronDown, Eye, FileSpreadsheet, GitCompare, MoreHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { RegionAutocomplete } from "@/components/ui/region-autocomplete";
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
const createColumns = (permissions: PermissionSet | null): ColumnDef<QuotationWithDetails>[] => [
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

      return <QuotationActions quotation={quotation} permissions={permissions} />;
    },
  },
];

// Actions dropdown for each quotation row
function QuotationActions({
  quotation,
  permissions
}: {
  quotation: QuotationWithDetails;
  permissions: PermissionSet | null;
}) {
  const router = useRouter();
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = (open: boolean) => {
    setShowDetailsModal(open);
    if (!open) {
      // Ensure state is fully reset when modal closes
      setTimeout(() => {
        setShowDetailsModal(false);
      }, 0);
    }
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

      <QuoteDetailsModal
        key={`details-modal-${quotation.id}-${showDetailsModal ? 'open' : 'closed'}`}
        quotationId={quotation.id}
        open={showDetailsModal}
        onOpenChange={handleCloseDetailsModal}
      />
    </>
  );
}

// Filter toolbar
function QuotationsFilters({
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
  onClearFilters,
}: {
  period: string;
  setPeriod: (value: string) => void;
  region: string;
  setRegion: (value: string) => void;
  supplierId: string;
  setSupplierId: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  availablePeriods: string[];
  availableSuppliers: Array<{ id: number; code: string; name: string }>;
  onClearFilters: () => void;
}) {
  const hasActiveFilters = period || region || supplierId || status;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-2">
      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        {/* Period Filter */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Kỳ báo giá" />
          </SelectTrigger>
          <SelectContent>
            {availablePeriods.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <RegionAutocomplete
          value={region}
          onValueChange={setRegion}
          placeholder="Khu vực"
          className="w-full md:w-[180px]"
        />

        {/* Supplier Filter */}
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Nhà cung cấp" />
          </SelectTrigger>
          <SelectContent>
            {availableSuppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.code} - {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          <X className="mr-2 h-4 w-4" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
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

  const columns = React.useMemo(() => createColumns(permissions), [permissions]);

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

  if (loading && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Báo giá Vùng</CardTitle>
          <CardDescription>Đang tải dữ liệu...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check permissions
  if (permissions && !permissions.canViewQuotes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không có quyền truy cập</CardTitle>
          <CardDescription>
            Bạn không có quyền xem báo giá. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý Báo giá Vùng</h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các báo giá từ nhà cung cấp theo khu vực
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions?.canCreateQuotes && (
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Excel...
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <QuotationsFilters
            period={period}
            setPeriod={setPeriod}
            region={region}
            setRegion={setRegion}
            supplierId={supplierId}
            setSupplierId={setSupplierId}
            status={status}
            setStatus={setStatus}
            availablePeriods={availablePeriods}
            availableSuppliers={availableSuppliers}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Danh sách Báo giá</CardTitle>
              <CardDescription>
                {totalCount > 0 ? `Tìm thấy ${totalCount} báo giá` : "Không có báo giá nào"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Cột hiển thị <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Trang {pagination.pageIndex + 1} / {totalPages} (Tổng cộng {totalCount} báo giá)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || loading}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || loading}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      <ImportExcelModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}