"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Plus, Settings2 } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import type { Quotation } from "@/lib/hooks/use-quotations";

// Filter options for quotations
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ Duyệt" },
  { value: "approved", label: "Đã Duyệt" },
  { value: "negotiation", label: "Đang Thương Lượng" },
  { value: "cancelled", label: "Đã Hủy" },
] as const;

// Period options (recent periods)
const periodOptions = [
  { value: "all", label: "Tất cả kỳ báo giá" },
  { value: "2024-12-01", label: "Tháng 12/2024" },
  { value: "2024-11-01", label: "Tháng 11/2024" },
  { value: "2024-10-01", label: "Tháng 10/2024" },
  { value: "2024-09-01", label: "Tháng 9/2024" },
] as const;

// Region options (common Vietnamese regions)
const regionOptions = [
  { value: "all", label: "Tất cả khu vực" },
  { value: "Miền Bắc", label: "Miền Bắc" },
  { value: "Miền Trung", label: "Miền Trung" },
  { value: "Miền Nam", label: "Miền Nam" },
  { value: "Hà Nội", label: "Hà Nội" },
  { value: "TP.HCM", label: "TP.HCM" },
  { value: "Đà Nẵng", label: "Đà Nẵng" },
] as const;

// Supplier options (placeholder - should be fetched from API)
const supplierOptions = [
  { value: "all", label: "Tất cả nhà cung cấp" },
  { value: "supplier-1", label: "Nhà cung cấp A" },
  { value: "supplier-2", label: "Nhà cung cấp B" },
  { value: "supplier-3", label: "Nhà cung cấp C" },
] as const;

// Team options (placeholder - should be permission-based)
const teamOptions = [
  { value: "all", label: "Tất cả bếp" },
  { value: "team-1", label: "Bếp Trung Tâm" },
  { value: "team-2", label: "Bếp Chi Nhánh 1" },
  { value: "team-3", label: "Bếp Chi Nhánh 2" },
] as const;

interface QuotationsTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  selectedPeriod?: string;
  onPeriodChange: (value: string) => void;
  selectedSupplier?: string;
  onSupplierChange: (value: string) => void;
  selectedRegion?: string;
  onRegionChange: (value: string) => void;
  selectedTeam?: string;
  onTeamChange: (value: string) => void;
  selectedStatus?: string;
  onStatusChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  hasActiveFiltersOnly?: boolean;

  // Table instance for column visibility
  table: Table<Quotation>;
}

export function QuotationsTableToolbar({
  searchValue = "",
  onSearchChange,
  selectedPeriod = "all",
  onPeriodChange,
  selectedSupplier = "all",
  onSupplierChange,
  selectedRegion = "all",
  onRegionChange,
  selectedTeam = "all",
  onTeamChange,
  selectedStatus = "all",
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  hasActiveFiltersOnly = false,
  table,
}: QuotationsTableToolbarProps) {
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

  // Placeholder add button handler
  const handleAddClick = () => {
    // TODO: Implement in future phase
    console.log("Add quotation functionality will be implemented in Phase 2");
  };

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo Quotation ID, nhà cung cấp, khu vực..."
      onSearchChange={handleLocalSearchChange}
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      hasActiveFiltersOnly={hasActiveFiltersOnly}
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
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {getColumnDisplayName(column.id)}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>
                <p>Ẩn/hiện cột</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Add Button (Placeholder) */}
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm
          </Button>
        </div>
      }
    >
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period Filter */}
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Kỳ báo giá" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier Filter */}
        <Select value={selectedSupplier} onValueChange={onSupplierChange}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Nhà cung cấp" />
          </SelectTrigger>
          <SelectContent>
            {supplierOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <Select value={selectedRegion} onValueChange={onRegionChange}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Khu vực" />
          </SelectTrigger>
          <SelectContent>
            {regionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Team Filter (Permission-based - for now showing all) */}
        <Select value={selectedTeam} onValueChange={onTeamChange}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Bếp" />
          </SelectTrigger>
          <SelectContent>
            {teamOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-[160px]">
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
      </div>
    </DataTableToolbar>
  );
}

// Helper function to get display names for columns
function getColumnDisplayName(columnId: string): string {
  const columnNames: Record<string, string> = {
    quotationId: "Quotation ID",
    period: "Kỳ báo giá",
    supplierCode: "Supplier ID",
    supplierName: "Tên nhà cung cấp",
    region: "Khu vực",
    category: "Nhóm hàng",
    quoteDate: "Ngày báo giá",
    updateDate: "Ngày cập nhật",
    status: "Trạng thái",
  };

  return columnNames[columnId] || columnId;
}

// Export options for use in other components
export { statusOptions, periodOptions, regionOptions, supplierOptions, teamOptions };