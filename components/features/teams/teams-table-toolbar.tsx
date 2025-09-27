'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Plus, Settings2 } from 'lucide-react';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { getTeamTypes } from '@/lib/actions/team.actions';
import type { Team } from '@/lib/hooks/use-teams';

// Single source of truth for status options
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt Động' },
  { value: 'inactive', label: 'Tạm Dừng' },
] as const;

// Team type display mapping for Vietnamese labels
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

interface TeamsTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  regions: string[];
  regionsLoading?: boolean;
  selectedRegion?: string;
  onRegionChange: (value: string) => void;
  selectedStatus?: string;
  onStatusChange: (value: string) => void;
  selectedTeamType?: string;
  onTeamTypeChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  // Table instance for column visibility
  table: Table<Team>;

  // Actions
  onCreateClick: () => void;
}

export function TeamsTableToolbar({
  searchValue = '',
  onSearchChange,
  regions,
  regionsLoading = false,
  selectedRegion = 'all',
  onRegionChange,
  selectedStatus = 'all',
  onStatusChange,
  selectedTeamType = 'all',
  onTeamTypeChange,
  onClearFilters,
  hasActiveFilters,
  table,
  onCreateClick,
}: TeamsTableToolbarProps) {
  // Local state for search input to enable debouncing
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Team type state - dynamic loading from database
  const [teamTypes, setTeamTypes] = useState<string[]>([]);
  const [teamTypesLoading, setTeamTypesLoading] = useState(false);

  // Debounce the search value to prevent API calls on every keystroke
  const [debouncedSearchValue] = useDebounce(localSearchValue, 300);

  // Sync local search value with external prop when it changes
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  // Trigger API call when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue !== searchValue) {
      onSearchChange(debouncedSearchValue);
    }
  }, [debouncedSearchValue, searchValue, onSearchChange]);

  // Fetch team types when component mounts
  useEffect(() => {
    const fetchTeamTypes = async () => {
      setTeamTypesLoading(true);
      try {
        const result = await getTeamTypes();
        if (Array.isArray(result)) {
          setTeamTypes(result);
        } else {
          console.error("Failed to fetch team types:", result.error);
          setTeamTypes([]);
        }
      } catch (error) {
        console.error("Error fetching team types:", error);
        setTeamTypes([]);
      } finally {
        setTeamTypesLoading(false);
      }
    };

    fetchTeamTypes();
  }, []);

  // Handle local search input change
  const handleLocalSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  // Build team type options dynamically
  const teamTypeOptions = [
    { value: 'all', label: 'Tất cả loại hình' },
    ...teamTypes.map(teamType => ({
      value: teamType,
      label: getTeamTypeDisplay(teamType),
    })),
  ];

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo tên nhóm, mã nhóm..."
      onSearchChange={handleLocalSearchChange}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      actions={
        <div className="flex items-center gap-2">
          {/* Column Visibility Toggle */}
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 hidden lg:flex"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="sr-only">Ẩn/hiện cột</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" && column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {getColumnDisplayName(column.id)}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>
                <p>Ẩn/hiện cột</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Create Button */}
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Nhóm
          </Button>
        </div>
      }
    >
      {/* Region Filter */}
      <Select value={selectedRegion} onValueChange={onRegionChange} disabled={regionsLoading}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder={regionsLoading ? "Đang tải..." : "Khu vực"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả khu vực</SelectItem>
          {regions.map((region) => (
            <SelectItem key={region} value={region}>
              {region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Team Type Filter - Dynamic Loading */}
      <Select
        value={selectedTeamType}
        onValueChange={onTeamTypeChange}
        disabled={teamTypesLoading}
      >
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder={teamTypesLoading ? "Đang tải..." : "Loại hình"} />
        </SelectTrigger>
        <SelectContent>
          {teamTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DataTableToolbar>
  );
}

// Helper function to get display names for columns
function getColumnDisplayName(columnId: string): string {
  const columnNames: Record<string, string> = {
    teamCode: 'Mã Nhóm',
    name: 'Tên Nhóm',
    teamType: 'Loại Hình',
    region: 'Khu Vực',
    managerName: 'Quản Lý',
    status: 'Trạng Thái',
    createdAt: 'Ngày Tạo',
  };

  return columnNames[columnId] || columnId;
}

// Export options for use in other components
export { statusOptions };