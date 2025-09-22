'use client';

import { useState, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, Edit, UserX, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

import { useStaff, type Staff } from '@/lib/hooks/use-staff';
import { activateStaff } from '@/lib/actions/staff.actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { StaffTableToolbar } from './staff-table-toolbar';
import { StaffFormModal } from './staff-form-modal';
import { StaffDeleteDialog } from './staff-delete-dialog';
import { TeamAssignmentModal } from './team-assignment-modal';

// Status badge variant mapping
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'terminated':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Status display mapping
const getStatusDisplay = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Hoạt Động';
    case 'inactive':
      return 'Tạm Dừng';
    case 'terminated':
      return 'Đã Nghỉ';
    default:
      return status;
  }
};

// Department display mapping
const getDepartmentDisplay = (department: string | null): string => {
  if (!department) return '-';

  switch (department.toUpperCase()) {
    case 'ADMIN':
      return 'Quản Trị';
    case 'PROCUREMENT':
      return 'Mua Sắm';
    case 'KITCHEN':
      return 'Bếp';
    case 'ACCOUNTING':
      return 'Kế Toán';
    case 'OPERATIONS':
      return 'Vận Hành';
    default:
      return department;
  }
};

// Format hire date
const formatHireDate = (date: Date | null): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('vi-VN');
  } catch {
    return '-';
  }
};

export function StaffDataTable() {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTeamAssignModalOpen, setIsTeamAssignModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Fetch staff data using our custom hook
  const {
    staff,
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
  } = useStaff();

  // Convert our URL sort state to TanStack Table sorting format
  const sorting: SortingState = useMemo(() => {
    if (urlState.sort.column && urlState.sort.order) {
      return [{ id: urlState.sort.column, desc: urlState.sort.order === 'desc' }];
    }
    return [];
  }, [urlState.sort.column, urlState.sort.order]);

  // Handle TanStack Table sorting changes and sync with URL state
  const handleSortingChange = (updater: any) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;

    if (newSorting.length === 0) {
      // No sorting - clear sort from URL
      setSort('');
    } else {
      // Extract the first sort (single column sorting)
      const { id, desc } = newSorting[0];
      setSort(id);
    }
  };

  // Event handlers
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleDepartmentChange = (value: string) => {
    setFilter('department', value === 'all' ? null : value);
  };

  const handleStatusChange = (value: string) => {
    setFilter('status', value === 'all' ? null : value);
  };

  const handleTeamChange = (value: string) => {
    setFilter('team', value === 'all' ? null : value);
  };

  const handlePageChange = (page: number) => {
    setPagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination({ limit: pageSize, page: 1 });
  };

  // Modal handlers
  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
  };

  const handleTeamAssignClick = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsTeamAssignModalOpen(true);
  };

  // Handle activating a staff member directly
  const handleActivateClick = async (staff: Staff) => {
    setActivatingId(staff.id);

    try {
      const result = await activateStaff({ id: staff.id });

      if (result.success) {
        toast.success(result.success);
        refresh(); // Refresh data to show updated status
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Activate staff error:', error);
      toast.error('Có lỗi xảy ra khi kích hoạt nhân viên');
    } finally {
      setActivatingId(null);
    }
  };

  // Modal close handlers
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setSelectedStaff(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedStaff(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedStaff(null);
  };

  const handleCloseTeamAssignModal = () => {
    setIsTeamAssignModalOpen(false);
    setSelectedStaff(null);
  };

  // Success handlers that refresh data and close modals
  const handleModalSuccess = () => {
    refresh();
  };

  // Table column definitions
  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: 'employeeCode',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Mã NV"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('employeeCode') || '-'}</div>
      ),
    },
    {
      accessorKey: 'name',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Tên Nhân Viên"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'email',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Email"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-muted-foreground">{row.getValue('email')}</div>
      ),
    },
    {
      accessorKey: 'phone',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Điện Thoại"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div>{row.getValue('phone') || '-'}</div>
      ),
    },
    {
      accessorKey: 'jobTitle',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Chức Danh"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate">
          {row.getValue('jobTitle') || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'department',
      enableSorting: true,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Phòng Ban"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div>{getDepartmentDisplay(row.getValue('department'))}</div>
      ),
    },
    {
      id: 'currentTeams',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Nhóm Làm Việc"
          column={column}
        />
      ),
      cell: ({ row }) => {
        const staff = row.original;
        const teams = staff.currentTeams || [];

        if (teams.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className="max-w-[200px]">
            <div className="flex flex-wrap gap-1">
              {teams.slice(0, 2).map((team, index) => (
                <Badge key={team.teamId} variant="outline" className="text-xs">
                  {team.teamName}
                </Badge>
              ))}
              {teams.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{teams.length - 2}
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'hireDate',
      enableSorting: true,
      enableHiding: true,
      meta: {
        defaultIsVisible: false,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Ngày Vào Làm"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div>{formatHireDate(row.getValue('hireDate'))}</div>
      ),
    },
    {
      accessorKey: 'status',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Trạng Thái"
          column={column}
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
      enableSorting: false,
      header: () => <div className="text-right">Thao Tác</div>,
      cell: ({ row }) => {
        const staff = row.original;

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
                <DropdownMenuItem onClick={() => handleEditClick(staff)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleTeamAssignClick(staff)}>
                  <Users className="mr-2 h-4 w-4" />
                  Quản lý nhóm
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {staff.status === 'active' ? (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(staff)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Tạm Dừng
                  </DropdownMenuItem>
                ) : staff.status === 'inactive' ? (
                  <DropdownMenuItem
                    onClick={() => handleActivateClick(staff)}
                    className="text-green-600 focus:text-green-600"
                    disabled={activatingId === staff.id}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {activatingId === staff.id ? 'Đang kích hoạt...' : 'Kích hoạt'}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Initialize table with proper TanStack Table sorting integration
  const table = useReactTable({
    data: staff,
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
        department: false, // Hide "Phòng Ban" by default
        hireDate: false,   // Hide "Ngày Vào Làm" by default
      },
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu nhân viên</p>
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
      <StaffTableToolbar
        searchValue={urlState.filters.search || ''}
        onSearchChange={handleSearchChange}
        selectedDepartment={urlState.filters.department || 'all'}
        onDepartmentChange={handleDepartmentChange}
        selectedStatus={urlState.filters.status || 'all'}
        onStatusChange={handleStatusChange}
        selectedTeam={urlState.filters.team || 'all'}
        onTeamChange={handleTeamChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
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
                  {isEmpty ? 'Không có dữ liệu nhân viên.' : 'Không tìm thấy kết quả.'}
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
      <StaffFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={handleModalSuccess}
        staff={null}
      />

      <StaffFormModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={handleModalSuccess}
        staff={selectedStaff}
      />

      <StaffDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onSuccess={handleModalSuccess}
        staff={selectedStaff}
        actionType="deactivate"
      />

      <TeamAssignmentModal
        isOpen={isTeamAssignModalOpen}
        onClose={handleCloseTeamAssignModal}
        onSuccess={handleModalSuccess}
        staff={selectedStaff}
      />
    </div>
  );
}