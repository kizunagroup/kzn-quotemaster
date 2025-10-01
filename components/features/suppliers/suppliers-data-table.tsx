"use client";

import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { MoreHorizontal, Edit, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";

import { useSuppliers, type Supplier } from "@/lib/hooks/use-suppliers";
import { toggleSupplierStatus } from "@/lib/actions/supplier.actions";
import { getStatusClassName, getStatusLabel } from "@/lib/utils/status-styles";
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

import { SuppliersTableToolbar } from "./suppliers-table-toolbar";
import { SupplierFormModal } from "./supplier-form-modal";
import { SupplierDeleteDialog } from "./supplier-delete-dialog";

// Date formatting helper - EXACTLY LIKE TEAMS
const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export function SuppliersDataTable() {
  // Modal states - CENTRALIZED STATE MANAGEMENT like Staff
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Fetch supplier data using our custom hook
  const {
    suppliers,
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
  } = useSuppliers();

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

  // Event handlers - CENTRALIZED like Staff pattern
  const handleSearchChange = (value: string) => {
    setSearch(value);
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

  // Modal handlers - CENTRALIZED like Staff pattern
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleToggleStatusClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  // Handle activating a supplier directly (like Staff pattern)
  const handleActivateClick = async (supplier: Supplier) => {
    setActivatingId(supplier.id);

    try {
      const result = await toggleSupplierStatus(supplier.id);

      if (result.success) {
        toast.success(result.success);
        refresh(); // Refresh data to show updated status
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Activate supplier error:", error);
      toast.error("Có lỗi xảy ra khi kích hoạt nhà cung cấp");
    } finally {
      setActivatingId(null);
    }
  };

  // Modal close handlers - CENTRALIZED like Staff pattern
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedSupplier(null);
  };

  // Success handlers that refresh data and close modals
  const handleModalSuccess = () => {
    refresh();
  };

  // Table column definitions
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "supplierCode",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Mã NCC" column={column} />
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("supplierCode") || "-"}</div>
      ),
    },
    {
      accessorKey: "name",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Tên Nhà Cung Cấp" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-sm">
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "contactPerson",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader title="Người Liên Hệ" column={column} />
      ),
      cell: ({ row }) => <div>{row.getValue("contactPerson") || "-"}</div>,
    },
    {
      accessorKey: "phone",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader title="Điện Thoại" column={column} />
      ),
      cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
    },
    {
      accessorKey: "email",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Email" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-muted-foreground">
          {row.getValue("email") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "taxId",
      enableSorting: false,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader title="Mã Số Thuế" column={column} />
      ),
      cell: ({ row }) => <div>{row.getValue("taxId") || "-"}</div>,
    },
    {
      accessorKey: "address",
      enableSorting: false,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader title="Địa Chỉ" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("address") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Trạng Thái" column={column} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={getStatusClassName(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Ngày Tạo" column={column} />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return <div className="text-sm">{date ? formatDate(date) : "-"}</div>;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-right">Thao Tác</div>,
      cell: ({ row }) => {
        const supplier = row.original;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Mở menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditClick(supplier)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {supplier.status === "active" ? (
                  <DropdownMenuItem
                    onClick={() => handleToggleStatusClick(supplier)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <PowerOff className="mr-2 h-4 w-4" />
                    Tạm Dừng
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleActivateClick(supplier)}
                    className="text-green-600 focus:text-green-600"
                    disabled={activatingId === supplier.id}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {activatingId === supplier.id
                      ? "Đang kích hoạt..."
                      : "Kích hoạt"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Initialize table with proper TanStack Table sorting integration
  const table = useReactTable({
    data: suppliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    // Enable sorting UI capabilities
    enableSorting: true,
    // Single column sorting only
    enableMultiSort: false,
    // Enable column hiding
    enableHiding: true,
    // Provide current sorting state and change handler
    state: {
      sorting,
    },
    onSortingChange: handleSortingChange,
    // Set initial column visibility based on meta.defaultIsVisible
    initialState: {
      columnVisibility: {
        taxId: false, // Hide "Mã Số Thuế" by default
        address: false, // Hide "Địa Chỉ" by default
        createdAt: false, // Hide "Ngày Tạo" by default - LIKE TEAMS
      },
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu nhà cung cấp</p>
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
      <SuppliersTableToolbar
        searchValue={urlState.filters.search || ""}
        onSearchChange={handleSearchChange}
        selectedStatus={urlState.filters.status || "all"}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        hasActiveFiltersOnly={hasActiveFiltersOnly}
        table={table}
        onCreateClick={handleCreateClick}
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
              Array.from({ length: 5 }).map((_, index) => (
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
                    ? "Không có dữ liệu nhà cung cấp."
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

      {/* Modal Components - STANDARDIZED DATA LOSS PREVENTION */}
      <SupplierFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleModalSuccess}
        supplier={null}
      />

      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
        supplier={selectedSupplier}
      />

      <SupplierDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleModalSuccess}
        supplier={selectedSupplier}
      />
    </div>
  );
}
