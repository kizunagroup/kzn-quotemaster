'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { Plus, Settings2, Upload } from 'lucide-react';
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
import type { Supplier } from '@/lib/hooks/use-suppliers';

// Single source of truth for status options
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Tạm dừng' },
] as const;

interface SuppliersTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  selectedStatus?: string;
  onStatusChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;

  // Table instance for column visibility
  table: Table<Supplier>;

  // Actions
  onCreateClick: () => void;
}

export function SuppliersTableToolbar({
  searchValue = '',
  onSearchChange,
  selectedStatus = 'all',
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  table,
  onCreateClick,
}: SuppliersTableToolbarProps) {
  // Local search state for immediate UI feedback
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Debounce search input to avoid excessive API calls
  const [debouncedSearchValue] = useDebounce(localSearchValue, 300);

  // Update parent component when debounced value changes
  useEffect(() => {
    if (onSearchChange && debouncedSearchValue !== searchValue) {
      onSearchChange(debouncedSearchValue);
    }
  }, [debouncedSearchValue, onSearchChange, searchValue]);

  // Sync local state when parent searchValue changes (e.g., from clear filters)
  useEffect(() => {
    if (localSearchValue !== searchValue) {
      setLocalSearchValue(searchValue);
    }
  }, [searchValue, localSearchValue]);

  // Handle local search change
  const handleSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  // Status filter component
  const statusFilter = (
    <Select value={selectedStatus} onValueChange={onStatusChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Column visibility dropdown
  const columnVisibilityDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings2 className="mr-2 h-4 w-4" />
          Cột hiển thị
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => {
            // Map column IDs to Vietnamese labels
            const columnLabels: Record<string, string> = {
              supplierCode: 'Mã NCC',
              name: 'Tên nhà cung cấp',
              contactPerson: 'Người liên hệ',
              phone: 'Điện thoại',
              email: 'Email',
              address: 'Địa chỉ',
              taxId: 'Mã số thuế',
              status: 'Trạng thái',
              createdAt: 'Ngày tạo',
            };

            const label = columnLabels[column.id] || column.id;

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {label}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Action buttons
  const actionButtons = (
    <div className="flex items-center space-x-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tính năng nhập Excel sẽ có trong phiên bản tiếp theo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button onClick={onCreateClick} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Thêm
      </Button>

      {columnVisibilityDropdown}
    </div>
  );

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm theo tên hoặc mã nhà cung cấp..."
      onSearchChange={handleSearchChange}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      actions={actionButtons}
      className="justify-between"
    >
      {/* Filter controls */}
      <div className="flex items-center space-x-2">
        {statusFilter}
      </div>
    </DataTableToolbar>
  );
}