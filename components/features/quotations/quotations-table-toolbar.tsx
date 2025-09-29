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
import { FileSpreadsheet } from "lucide-react";
import type { QuotationWithDetails } from "@/lib/actions/quotations.actions";

// Static status options (these don't change)
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ Duyệt" },
  { value: "approved", label: "Đã Duyệt" },
  { value: "negotiation", label: "Đang Thương Lượng" },
  { value: "cancelled", label: "Đã Hủy" },
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
  selectedStatus?: string;
  onStatusChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  hasActiveFiltersOnly?: boolean;

  // Table instance for column visibility
  table: Table<QuotationWithDetails>;

  // Actions
  onImportClick: () => void;

  // Available filter options
  availablePeriods: string[];
  availableSuppliers: Array<{ id: number; code: string; name: string }>;
}

export function QuotationsTableToolbar({
  searchValue = "",
  onSearchChange,
  selectedPeriod = "",
  onPeriodChange,
  selectedSupplier = "",
  onSupplierChange,
  selectedRegion = "",
  onRegionChange,
  selectedStatus = "",
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  hasActiveFiltersOnly = false,
  table,
  onImportClick,
  availablePeriods,
  availableSuppliers,
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

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo mã báo giá, nhà cung cấp, khu vực..."
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

          {/* Import Button - PRIMARY ACTION */}
          <Button onClick={onImportClick}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Import Báo giá
          </Button>
        </div>
      }
    >
      {/* Period Filter */}
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="Kỳ báo giá" />
        </SelectTrigger>
        <SelectContent>
          {availablePeriods.map((period) => (
            <SelectItem key={period} value={period}>
              {period}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Supplier Filter */}
      <Select value={selectedSupplier} onValueChange={onSupplierChange}>
        <SelectTrigger className="h-8 w-[200px]">
          <SelectValue placeholder="Nhà cung cấp" />
        </SelectTrigger>
        <SelectContent>
          {availableSuppliers.map((supplier) => (
            <SelectItem key={supplier.id} value={supplier.id.toString()}>
              {supplier.code} - {supplier.name}
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
    period: "Kỳ báo giá",
    region: "Khu vực",
    "supplier.supplierCode": "Mã NCC",
    "supplier.name": "Tên NCC",
    status: "Trạng thái",
    itemCount: "Số SP",
    createdAt: "Ngày tạo",
    "creator.name": "Người tạo",
  };

  return columnNames[columnId] || columnId;
}

// Export static options for use in other components
export { statusOptions };