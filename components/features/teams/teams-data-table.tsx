'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { MoreHorizontal, Edit, PowerOff, Play } from 'lucide-react';
import { toast } from 'sonner';

import { useTeams, type Team } from '@/lib/hooks/use-teams';
import { useDataTableUrlState } from '@/lib/hooks/use-data-table-url-state';
import { getRegions, activateTeam } from '@/lib/actions/team.actions';
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
import { TeamsTableToolbar } from './teams-table-toolbar';
import { TeamFormModal } from './team-form-modal';
import { TeamDeleteDialog } from './team-delete-dialog';

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
  switch (teamType.toUpperCase()) {
    case 'KITCHEN':
      return 'Nhóm Bếp';
    case 'OFFICE':
      return 'Văn Phòng';
    default:
      return teamType;
  }
};

// Team type badge variant mapping
const getTeamTypeVariant = (teamType: string): 'default' | 'secondary' | 'outline' => {
  switch (teamType.toUpperCase()) {
    case 'KITCHEN':
      return 'default';
    case 'OFFICE':
      return 'secondary';
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
    case 'suspended':
      return 'Đình Chỉ';
    default:
      return status;
  }
};

// Date formatting helper
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export function TeamsDataTable() {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // Independent regions data for filter dropdown
  const [allRegions, setAllRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);

  // URL state management
  const {
    filters,
    sort,
    setSearch,
    setFilter,
    setSort,
    setPagination,
    clearFilters,
    hasActiveFilters,
  } = useDataTableUrlState({
    defaultSort: { column: 'teamCode', order: 'asc' },
    defaultPagination: { page: 1, limit: 10 },
  });

  // Fetch teams data using our custom hook
  const {
    teams,
    pagination: teamsPagination,
    isLoading,
    error,
    isEmpty,
    refresh,
  } = useTeams();

  // Convert our URL sort state to TanStack Table sorting format
  const sorting: SortingState = useMemo(() => {
    if (sort.column && sort.order) {
      return [{ id: sort.column, desc: sort.order === 'desc' }];
    }
    return [];
  }, [sort.column, sort.order]);

  // Handle TanStack Table sorting changes and sync with URL state
  const handleSortingChange = (updater: any) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;

    if (newSorting.length === 0) {
      // No sorting - clear sort from URL
      setSort('');
    } else {
      // Extract the first sort (single column sorting)
      const { id } = newSorting[0];
      setSort(id);
    }
  };

  // Fetch all regions independently for the filter dropdown
  useEffect(() => {
    const fetchAllRegions = async () => {
      setRegionsLoading(true);
      try {
        const result = await getRegions();
        if (Array.isArray(result)) {
          setAllRegions(result);
        } else {
          console.error('Failed to fetch regions:', result.error);
          setAllRegions([]);
        }
      } catch (error) {
        console.error('Error fetching regions:', error);
        setAllRegions([]);
      } finally {
        setRegionsLoading(false);
      }
    };

    fetchAllRegions();
  }, []);

  // Event handlers
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleRegionChange = (value: string) => {
    setFilter('region', value === 'all' ? null : value);
  };

  const handleStatusChange = (value: string) => {
    setFilter('status', value === 'all' ? null : value);
  };

  const handleTeamTypeChange = (value: string) => {
    setFilter('teamType', value === 'all' ? null : value);
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

  const handleEditClick = (team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteModalOpen(true);
  };

  // Handle activating a team directly
  const handleActivateClick = async (team: Team) => {
    setActivatingId(team.id);

    try {
      const result = await activateTeam({ id: team.id });

      if (result.success) {
        toast.success(result.success);
        refresh(); // Refresh data to show updated status
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Activate team error:', error);
      toast.error('Có lỗi xảy ra khi kích hoạt nhóm');
    } finally {
      setActivatingId(null);
    }
  };

  // Table column definitions
  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: 'teamCode',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Mã Nhóm"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('teamCode') || '-'}</div>
      ),
    },
    {
      accessorKey: 'name',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Tên Nhóm"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'teamType',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Loại Hình"
          column={column}
        />
      ),
      cell: ({ row }) => {
        const teamType = row.getValue('teamType') as string;
        return (
          <Badge variant={getTeamTypeVariant(teamType)}>
            {getTeamTypeDisplay(teamType)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'region',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Khu Vực"
          column={column}
        />
      ),
      cell: ({ row }) => (
        <div>{row.getValue('region')}</div>
      ),
    },
    {
      accessorKey: 'managerName',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Quản Lý"
          column={column}
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
      accessorKey: 'createdAt',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          title="Ngày Tạo"
          column={column}
        />
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date;
        return <div className="text-sm">{formatDate(date)}</div>;
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <div className="text-right">Thao Tác</div>,
      cell: ({ row }) => {
        const team = row.original;

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
                <DropdownMenuItem onClick={() => handleEditClick(team)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {team.status === 'active' ? (
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(team)}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    <PowerOff className="mr-2 h-4 w-4" />
                    Tạm Dừng
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleActivateClick(team)}
                    className="text-green-600 focus:text-green-600"
                    disabled={activatingId === team.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {activatingId === team.id ? 'Đang kích hoạt...' : 'Kích hoạt'}
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
    data: teams,
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
    // Set initial column visibility - hide "Ngày Tạo" column by default
    initialState: {
      columnVisibility: {
        createdAt: false, // Hide "Ngày Tạo" column by default
      },
    },
    // Provide current sorting state and change handler
    state: {
      sorting,
    },
    onSortingChange: handleSortingChange,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-center">
          <p className="text-destructive mb-2">Lỗi tải dữ liệu nhóm</p>
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
      <TeamsTableToolbar
        searchValue={filters.search || ''}
        onSearchChange={handleSearchChange}
        regions={allRegions}
        regionsLoading={regionsLoading}
        selectedRegion={filters.region || 'all'}
        onRegionChange={handleRegionChange}
        selectedStatus={filters.status || 'all'}
        onStatusChange={handleStatusChange}
        selectedTeamType={filters.teamType || 'all'}
        onTeamTypeChange={handleTeamTypeChange}
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
                  {isEmpty ? 'Không có dữ liệu nhóm.' : 'Không tìm thấy kết quả.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {teamsPagination && (
        <DataTablePagination
          pagination={teamsPagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Modal Components */}
      <TeamFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refresh}
        team={null}
      />

      <TeamFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={refresh}
        team={selectedTeam}
      />

      <TeamDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={refresh}
        team={selectedTeam}
      />
    </div>
  );
}