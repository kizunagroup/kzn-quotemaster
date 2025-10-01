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
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { useQuotations, type Quotation } from "@/lib/hooks/use-quotations";
import {
  cancelQuotation,
  getCurrentUserPermissions,
  getAvailablePeriods,
  getAvailableSuppliers,
  getAvailableCategories,
} from "@/lib/actions/quotations.actions";
import { type PermissionSet } from "@/lib/auth/permissions";
import { ImportExcelModal } from "./import-excel-modal";
import { QuoteDetailsModal } from "./quote-details-modal";
import { QuotationsTableToolbar, getStatusLabel, getStatusVariant } from "./quotations-table-toolbar";

// Status helpers are now imported from the toolbar for consistency

// Table columns definition (matching Products pattern)
const createColumns = (
  permissions: PermissionSet | null,
  onViewDetails: (quotation: Quotation) => void,
  onSort: (column: string) => void,
  onRefresh: () => void
): ColumnDef<Quotation>[] => [
  {
    accessorKey: "period",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Kỳ báo giá" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("period")}</div>
    ),
  },
  {
    accessorKey: "region",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Khu vực" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[100px] truncate">{row.getValue("region")}</div>
    ),
  },
  {
    accessorKey: "supplierCode",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mã NCC" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue("supplierCode")}</div>
    ),
  },
  {
    accessorKey: "supplierName",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tên NCC" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.getValue("supplierName") as string}>
        {row.getValue("supplierName")}
      </div>
    ),
  },
  {
    accessorKey: "categories",
    enableSorting: false,
    header: "Nhóm hàng",
    cell: ({ row }) => {
      const categories = row.getValue("categories") as string[];
      if (!categories || categories.length === 0) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {categories.slice(0, 2).map((category, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
          {categories.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{categories.length - 2}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trạng thái" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={getStatusVariant(status)}>
          {getStatusLabel(status)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "itemCount",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Số SP" />
    ),
    cell: ({ row }) => (
      <div className="text-center font-narrow">{row.getValue("itemCount")}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ngày tạo" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date | null;
      return (
        <div className="text-sm">
          {date ? new Date(date).toLocaleDateString("vi-VN") : "N/A"}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const quotation = row.original;
      return <QuotationActions quotation={quotation} permissions={permissions} onViewDetails={onViewDetails} onRefresh={onRefresh} />;
    },
  },
];

// Actions dropdown for each quotation row (matching Products pattern)
function QuotationActions({
  quotation,
  permissions,
  onViewDetails,
  onRefresh
}: {
  quotation: Quotation;
  permissions: PermissionSet | null;
  onViewDetails: (quotation: Quotation) => void;
  onRefresh: () => void;
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
        onRefresh(); // Refresh the data table
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


// Main data table component (refactored to match Products pattern)
export function QuotationsDataTable() {
  const [permissions, setPermissions] = React.useState<PermissionSet | null>(null);
  const [availablePeriods, setAvailablePeriods] = React.useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = React.useState<Array<{ id: number; code: string; name: string }>>([]);
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);

  // Use the new useQuotations hook (following Products pattern)
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

  // Modal states - CENTRALIZED STATE MANAGEMENT like Suppliers
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [selectedQuotation, setSelectedQuotation] = React.useState<Quotation | null>(null);

  // Convert our URL sort state to TanStack Table sorting format (matching Products pattern)
  const sorting: SortingState = React.useMemo(() => {
    if (urlState.sort.column && urlState.sort.order) {
      return [
        { id: urlState.sort.column, desc: urlState.sort.order === "desc" },
      ];
    }
    return [];
  }, [urlState.sort.column, urlState.sort.order]);

  // Handle TanStack Table sorting changes and sync with URL state (matching Products pattern)
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

  // Fetch helper data (permissions, periods, suppliers) on mount
  React.useEffect(() => {
    const fetchHelperData = async () => {
      try {
        const [periods, suppliers, categories, permissionsResult] = await Promise.all([
          getAvailablePeriods(),
          getAvailableSuppliers(),
          getAvailableCategories(),
          getCurrentUserPermissions(),
        ]);
        setAvailablePeriods(periods);
        setAvailableSuppliers(suppliers);
        setAvailableCategories(categories);

        if (permissionsResult.success && permissionsResult.permissions) {
          setPermissions(permissionsResult.permissions);
        } else {
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
    };

    fetchHelperData();
  }, []);

  // Event handlers - CENTRALIZED like Products pattern
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

  const handleCategoryChange = (value: string) => {
    setFilter("category", value === "all" ? null : value);
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

  // Modal handlers - CENTRALIZED like Products pattern
  const handleViewDetailsClick = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedQuotation(null);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    refresh();
    toast.success("Import báo giá thành công");
  };

  // Table configuration - matching Products pattern
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns = React.useMemo(
    () => createColumns(permissions, handleViewDetailsClick, setSort, refresh),
    [permissions, handleViewDetailsClick, setSort, refresh]
  );

  const table = useReactTable({
    data: quotations,
    columns,
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination?.pages || 0,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: (pagination?.page || 1) - 1,
        pageSize: pagination?.limit || 10,
      },
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
        selectedCategory={urlState.filters.category || "all"}
        onCategoryChange={handleCategoryChange}
        selectedStatus={urlState.filters.status || "all"}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        hasActiveFiltersOnly={hasActiveFiltersOnly}
        table={table}
        onImportClick={() => setShowImportModal(true)}
        availablePeriods={availablePeriods}
        availableSuppliers={availableSuppliers}
        availableCategories={availableCategories}
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
                  {isLoading ? "Đang tải..." : "Không có kết quả."}
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