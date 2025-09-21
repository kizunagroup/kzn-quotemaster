'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';

// Single source of truth for status options
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt Động' },
  { value: 'inactive', label: 'Tạm Dừng' },
] as const;

interface KitchensTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  regions: string[];
  selectedRegion?: string;
  onRegionChange: (value: string) => void;
  selectedStatus?: string;
  onStatusChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  // Actions
  onCreateClick: () => void;
}

export function KitchensTableToolbar({
  searchValue = '',
  onSearchChange,
  regions,
  selectedRegion = 'all',
  onRegionChange,
  selectedStatus = 'all',
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  onCreateClick,
}: KitchensTableToolbarProps) {
  // Local state for search input to enable debouncing
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

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

  // Handle local search input change
  const handleLocalSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo tên bếp, mã bếp..."
      onSearchChange={handleLocalSearchChange}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      actions={
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm Bếp
        </Button>
      }
    >
      {/* Region Filter */}
      <Select value={selectedRegion} onValueChange={onRegionChange}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Khu vực" />
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

// Export status options for use in other components
export { statusOptions };