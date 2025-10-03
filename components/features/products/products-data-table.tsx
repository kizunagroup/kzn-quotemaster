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

import { useProducts, type Product } from "@/lib/hooks/use-products";
import { toggleProductStatus } from "@/lib/actions/product.actions";
import { getStatusClassName, getStatusLabel } from "@/lib/utils/status-styles";
import { formatNumber } from "@/lib/utils";
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

import { ProductsTableToolbar } from "./products-table-toolbar";
import { ProductFormModal } from "./product-form-modal";
import { ProductDeleteDialog } from "./product-delete-dialog";
import { ProductImportModal } from "./product-import-modal";

// Date formatting helper - EXACTLY LIKE TEAMS
const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};


export function ProductsDataTable() {
  // Modal states - SIMPLIFIED like Quotations pattern (no key-based reset for simple modals)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Key-based Reset Pattern for form modals only
  const [createModalKey, setCreateModalKey] = useState(0);
  const [editModalKey, setEditModalKey] = useState(0);
  const [deleteModalKey, setDeleteModalKey] = useState(0);

  // Fetch product data using our custom hook
  const {
    products,
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
  } = useProducts();

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

  // Modal handlers - CENTRALIZED like Staff pattern with Key-based Reset Pattern
  const handleCreateClick = () => {
    setCreateModalKey((prev) => prev + 1); // Reset modal key
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setEditModalKey((prev) => prev + 1); // Reset modal key
    setIsEditModalOpen(true);
  };

  const handleToggleStatusClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteModalKey((prev) => prev + 1); // Reset modal key
    setIsDeleteModalOpen(true);
  };

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  // Handle activating a product directly (like Staff pattern)
  const handleActivateClick = async (product: Product) => {
    setActivatingId(product.id);

    try {
      const result = await toggleProductStatus(product.id);

      if (result.success) {
        toast.success(result.success);
        refresh(); // Refresh data to show updated status
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Activate product error:", error);
      toast.error("Có lỗi xảy ra khi kích hoạt hàng hóa");
    } finally {
      setActivatingId(null);
    }
  };

  // Modal close handlers - CENTRALIZED like Staff pattern
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProduct(null);
  };

  const handleImportSuccess = () => {
    refresh();
    setShowImportModal(false);
  };

  // Success handlers that refresh data and close modals
  const handleModalSuccess = () => {
    refresh();
  };

  // Table column definitions
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "productCode",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Mã hàng" column={column} />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.getValue("productCode")}
        </div>
      ),
    },
    {
      accessorKey: "name",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Tên hàng" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-sm">
          {row.getValue("name")}
        </div>
      ),
    },
    {
      accessorKey: "specification",
      enableSorting: false,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader title="Quy cách" column={column} />
      ),
      cell: ({ row }) => {
        const spec = row.getValue("specification") as string;
        return (
          <div className="max-w-[150px] truncate text-sm text-muted-foreground">
            {spec || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "unit",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader title="Đvt" column={column} />
      ),
      cell: ({ row }) => <div className="text-sm">{row.getValue("unit")}</div>,
    },
    {
      accessorKey: "category",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Nhóm hàng" column={column} />
      ),
      cell: ({ row }) => (
        <div className="max-w-[120px] truncate text-sm">{row.getValue("category")}</div>
      ),
    },
    {
      accessorKey: "basePrice",
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader title="Giá cơ sở" column={column} />
      ),
      cell: ({ row }) => {
        const price = row.getValue("basePrice") as string;
        return (
          <div className="text-right font-narrow text-sm">{formatNumber(price)}</div>
        );
      },
    },
    {
      accessorKey: "baseQuantity",
      enableSorting: false,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader title="SL cơ sở" column={column} />
      ),
      cell: ({ row }) => {
        const quantity = row.getValue("baseQuantity") as string;
        return (
          <div className="text-right font-narrow text-sm">
            {quantity ? Number(quantity).toLocaleString("vi-VN") : "-"}
          </div>
        );
      },
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
          <Badge className={getStatusClassName(status)}>
            {getStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      enableSorting: true,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader title="Ngày tạo" column={column} />
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date;
        return <div className="text-sm">{date ? formatDate(date) : "-"}</div>;
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-right">Thao tác</div>,
      cell: ({ row }) => {
        const product = row.original;

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
                <DropdownMenuItem onClick={() => handleEditClick(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {product.status === "active" ? (
                  <DropdownMenuItem
                    onClick={() => handleToggleStatusClick(product)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <PowerOff className="mr-2 h-4 w-4" />
                    Tạm dừng
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleActivateClick(product)}
                    className="text-green-600 focus:text-green-600"
                    disabled={activatingId === product.id}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    {activatingId === product.id
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
    data: products,
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
        specification: false, // Hide "Quy cách" by default
        baseQuantity: false, // Hide "SL cơ sở" by default
        createdAt: false, // Hide "Ngày tạo" by default - LIKE TEAMS
      },
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu hàng hóa</p>
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
      <ProductsTableToolbar
        searchValue={urlState.filters.search || ""}
        onSearchChange={handleSearchChange}
        selectedCategory={urlState.filters.category || "all"}
        onCategoryChange={handleCategoryChange}
        selectedStatus={urlState.filters.status || "all"}
        onStatusChange={handleStatusChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        hasActiveFiltersOnly={hasActiveFiltersOnly}
        table={table}
        onCreateClick={handleCreateClick}
        onImportClick={handleImportClick}
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
                    ? "Không có dữ liệu hàng hóa."
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

      {/* Modal Components - KEY-BASED RESET PATTERN */}
      <ProductFormModal
        key={`create-${createModalKey}`}
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleModalSuccess}
        product={null}
      />

      <ProductFormModal
        key={`edit-${editModalKey}`}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
        product={selectedProduct}
      />

      <ProductDeleteDialog
        key={`delete-${deleteModalKey}`}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleModalSuccess}
        product={selectedProduct}
      />

      {/* Import Modal - SIMPLIFIED like Quotations pattern */}
      <ProductImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
