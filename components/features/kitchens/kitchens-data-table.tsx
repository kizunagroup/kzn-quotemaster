'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, Plus, Edit, Trash2 } from 'lucide-react';

import { useKitchens, type Kitchen } from '@/lib/hooks/use-kitchens';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { KitchensTableToolbar } from './kitchens-table-toolbar';
import { KitchenFormModal } from './kitchen-form-modal';
import { KitchenDeleteDialog } from './kitchen-delete-dialog';

// Status badge variant mapping
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'hoạt động':
      return 'default';
    case 'inactive':
    case 'tạm dừng':
      return 'secondary';
    case 'suspended':
    case 'đình chỉ':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Team type display mapping
const getTeamTypeDisplay = (teamType: string): string => {
  switch (teamType.toLowerCase()) {
    case 'central_kitchen':
      return 'Bếp Trung Tâm';
    case 'franchise':
      return 'Nhượng Quyền';
    case 'company_owned':
      return 'Cửa Hàng Trực Thuộc';
    default:
      return teamType;
  }
};

// Status display mapping
const getStatusDisplay = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Hoạt Động';
    case 'inactive':
      return 'Tạm Dừng';
    case 'suspended':
      return 'Đình Chỉ';
    default:
      return status;
  }
};

export function KitchensDataTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);

  // Fetch kitchen data using our custom hook
  const {
    kitchens,
    pagination,
    filters,
    isLoading,
    error,
    isEmpty,
    refresh,
  } = useKitchens();

  // URL state management functions
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change (except for page changes)
    if (!updates.page) {
      params.delete('page');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Search handler
  const handleSearchChange = (value: string) => {
    updateSearchParams({ search: value });
  };

  // Region filter handler
  const handleRegionChange = (value: string) => {
    updateSearchParams({ region: value === 'all' ? null : value });
  };

  // Status filter handler
  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value === 'all' ? null : value });
  };

  // Fixed sort handler with proper cycling logic
  const handleSort = (column: string) => {
    const currentSort = filters?.sort;
    const currentOrder = filters?.order;

    let newDirection: 'asc' | 'desc' | null = 'asc';

    // Cycle through: no sort -> asc -> desc -> no sort
    if (currentSort === column) {
      if (currentOrder === 'asc') {
        newDirection = 'desc';
      } else if (currentOrder === 'desc') {
        newDirection = null; // Clear sort
      }
    }

    if (newDirection === null) {
      updateSearchParams({ sort: null, order: null });
    } else {
      updateSearchParams({ sort: column, order: newDirection });
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    updateSearchParams({ page: page.toString() });
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateSearchParams({ limit: pageSize.toString(), page: null });
  };

  // Clear all filters
  const handleClearFilters = () => {
    router.push(pathname);
  };

  // Modal handlers
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
    setIsDeleteModalOpen(true);
  };

  // Table column definitions
  const columns: ColumnDef<Kitchen>[] = [
    {
      accessorKey: 'kitchenCode',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Mã Bếp"
          column={column}
          onSort={() => handleSort('kitchenCode')}
          sortState={
            filters?.sort === 'kitchenCode'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('kitchenCode')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Tên Bếp"
          column={column}
          onSort={() => handleSort('name')}
          sortState={
            filters?.sort === 'name'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'region',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Khu Vực"
          column={column}
          onSort={() => handleSort('region')}
          sortState={
            filters?.sort === 'region'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <div>{row.getValue('region')}</div>
      ),
    },
    {
      accessorKey: 'teamType',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Loại Hình"
          column={column}
          onSort={() => handleSort('teamType')}
          sortState={
            filters?.sort === 'teamType'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <div>{getTeamTypeDisplay(row.getValue('teamType'))}</div>
      ),
    },
    {
      accessorKey: 'managerName',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Quản Lý"
          column={column}
          onSort={() => handleSort('managerName')}
          sortState={
            filters?.sort === 'managerName'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate">
          {row.getValue('managerName') || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Trạng Thái"
          column={column}
          onSort={() => handleSort('status')}
          sortState={
            filters?.sort === 'status'
              ? filters?.order as 'asc' | 'desc'
              : undefined
          }
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusDisplay(status)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Thao Tác</div>,
      cell: ({ row }) => {
        const kitchen = row.original;

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
                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleEditClick(kitchen)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(kitchen)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Ngưng hoạt động
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Initialize table
  const table = useReactTable({
    data: kitchens,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  // Check if filters are active
  const hasActiveFilters = Boolean(
    filters?.search ||
    filters?.region ||
    (filters?.status && filters.status !== 'all')
  );

  // Get unique regions for filter dropdown
  const regions = [...new Set(kitchens.map(k => k.region))].sort();

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu bếp</p>
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
      <KitchensTableToolbar
        searchValue={filters?.search || ''}
        onSearchChange={handleSearchChange}
        regions={regions}
        selectedRegion={filters?.region || 'all'}
        onRegionChange={handleRegionChange}
        selectedStatus={filters?.status || 'all'}
        onStatusChange={handleStatusChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
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
                  data-state={row.getIsSelected() && 'selected'}
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
                  {isEmpty ? 'Không có dữ liệu bếp.' : 'Không tìm thấy kết quả.'}
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

      {/* Modal Components */}
      <KitchenFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refresh}
        kitchen={null}
      />

      <KitchenFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={refresh}
        kitchen={selectedKitchen}
      />

      <KitchenDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={refresh}
        kitchen={selectedKitchen}
      />
    </div>
  );
}