'use client';

import { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, Edit, PowerOff, Power } from 'lucide-react';

import { useSuppliers, type Supplier } from '@/lib/hooks/use-suppliers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

import { SuppliersTableToolbar } from './suppliers-table-toolbar';
import { SupplierFormModal } from './supplier-form-modal';
import { SupplierDeleteDialog } from './supplier-delete-dialog';

export function SuppliersDataTable() {
  // Modal state management
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Hook for data fetching and URL state management
  const {
    suppliers,
    pagination,
    isLoading,
    error,
    isEmpty,
    refresh,
    urlState: { filters, sort },
    setSearch,
    setFilter,
    setPagination,
    hasActiveFilters,
    clearFilters,
  } = useSuppliers();

  // Column definitions with Vietnamese headers
  const columns: ColumnDef<Supplier>[] = useMemo(
    () => [
      {
        accessorKey: 'supplierCode',
        id: 'supplierCode',
        enableSorting: true,
        header: ({ column }) => (
          <DataTableColumnHeader title="Mã NCC" column={column} />
        ),
        cell: ({ row }) => {
          const code = row.getValue('supplierCode') as string | null;
          return (
            <div className="font-medium">
              {code || <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'name',
        id: 'name',
        enableSorting: true,
        header: ({ column }) => (
          <DataTableColumnHeader title="Tên Nhà Cung Cấp" column={column} />
        ),
        cell: ({ row }) => (
          <div className="max-w-[200px] font-medium">
            {row.getValue('name')}
          </div>
        ),
      },
      {
        accessorKey: 'contactPerson',
        id: 'contactPerson',
        enableSorting: false,
        header: () => <div>Người liên hệ</div>,
        cell: ({ row }) => {
          const contact = row.getValue('contactPerson') as string | null;
          return (
            <div className="max-w-[150px]">
              {contact || <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        id: 'phone',
        enableSorting: false,
        header: () => <div>Điện thoại</div>,
        cell: ({ row }) => {
          const phone = row.getValue('phone') as string | null;
          return (
            <div className="font-mono text-sm">
              {phone || <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        id: 'email',
        enableSorting: false,
        header: () => <div>Email</div>,
        cell: ({ row }) => {
          const email = row.getValue('email') as string | null;
          return (
            <div className="max-w-[200px] text-sm">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {email}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        id: 'status',
        enableSorting: true,
        header: ({ column }) => (
          <DataTableColumnHeader title="Trạng thái" column={column} />
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return (
            <Badge variant={status === 'active' ? 'default' : 'secondary'}>
              {status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const supplier = row.original;
          const isActive = supplier.status === 'active';

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
                  <DropdownMenuItem
                    onClick={() => handleToggleStatusClick(supplier)}
                    className={isActive ? 'text-orange-600' : 'text-green-600'}
                  >
                    {isActive ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Kích hoạt
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  // Convert URL sort state to TanStack Table format
  const sorting: SortingState = useMemo(() => {
    if (!sort.column || !sort.order) return [];
    return [{ id: sort.column, desc: sort.order === 'desc' }];
  }, [sort.column, sort.order]);

  // Table configuration
  const table = useReactTable({
    data: suppliers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    enableSorting: true,
    enableHiding: true,
    state: { sorting },
    onSortingChange: () => {}, // Handled by URL state
    pageCount: pagination?.totalPages || 0,
    initialState: {
      columnVisibility: {
        // Set default column visibility
        supplierCode: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: false, // Hide email by default on mobile
        status: true,
        actions: true,
      },
    },
  });

  // Event handlers
  const handleCreateClick = () => {
    setSelectedSupplier(null);
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

  const handleSuccess = () => {
    refresh();
  };

  // Handle column sorting from header clicks
  const handleSortingChange = (updaterOrValue: any) => {
    // This is handled by the DataTableColumnHeader component
    // which calls the URL state management functions directly
  };

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center space-y-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <div>
              <h3 className="text-lg font-medium">Có lỗi xảy ra</h3>
              <p className="text-muted-foreground text-sm">{error.message}</p>
            </div>
            <Button onClick={refresh} variant="outline">
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <SuppliersTableToolbar
        searchValue={filters.search || ''}
        onSearchChange={setSearch}
        selectedStatus={filters.status || 'all'}
        onStatusChange={(value) => setFilter('status', value === 'all' ? null : value)}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        table={table}
        onCreateClick={handleCreateClick}
      />

      {/* Main table card */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhà cung cấp</CardTitle>
          <CardDescription>
            Quản lý thông tin nhà cung cấp trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      {columns.map((_, colIndex) => (
                        <TableCell key={`loading-cell-${colIndex}`}>
                          <div className="h-6 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : isEmpty ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          {hasActiveFilters
                            ? 'Không tìm thấy nhà cung cấp phù hợp với bộ lọc hiện tại'
                            : 'Chưa có nhà cung cấp nào được tạo'
                          }
                        </p>
                        {!hasActiveFilters && (
                          <Button onClick={handleCreateClick} variant="outline" size="sm">
                            Thêm nhà cung cấp đầu tiên
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="mt-4">
              <DataTablePagination
                pagination={pagination}
                onPageChange={(page) => setPagination({ page })}
                onPageSizeChange={(pageSize) => setPagination({ limit: pageSize, page: 1 })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SupplierFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
        supplier={null}
      />

      <SupplierFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleSuccess}
        supplier={selectedSupplier}
      />

      <SupplierDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleSuccess}
        supplier={selectedSupplier}
      />
    </div>
  );
}