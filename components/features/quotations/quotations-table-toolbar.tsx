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
import {
  getQuotationPeriods,
  getQuotationSuppliers,
  getQuotationTeams
} from "@/lib/actions/quotation.actions";

// Static status options (these don't change)
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ Duyệt" },
  { value: "approved", label: "Đã Duyệt" },
  { value: "negotiation", label: "Đang Thương Lượng" },
  { value: "cancelled", label: "Đã Hủy" },
] as const;

// Dynamic option types
type OptionType = { value: string; label: string };

// Helper function to format period display
function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-');
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  const monthIndex = parseInt(month) - 1;
  return `${monthNames[monthIndex]}/${year}`;
}

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

  // Dynamic filter options state
  const [periodOptions, setPeriodOptions] = useState<OptionType[]>([
    { value: "all", label: "Tất cả kỳ báo giá" }
  ]);
  const [supplierOptions, setSupplierOptions] = useState<OptionType[]>([
    { value: "all", label: "Tất cả nhà cung cấp" }
  ]);
  const [teamOptions, setTeamOptions] = useState<OptionType[]>([
    { value: "all", label: "Tất cả bếp" }
  ]);
  const [regionOptions, setRegionOptions] = useState<OptionType[]>([
    { value: "all", label: "Tất cả khu vực" }
  ]);

  // Loading states
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Debounce the search value to prevent API calls on every keystroke
  const [debouncedSearchValue] = useDebounce(localSearchValue, 300);

  // Load dynamic filter options on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setIsLoadingOptions(true);

        // Fetch all filter options in parallel
        const [periods, suppliers, teams] = await Promise.all([
          getQuotationPeriods(),
          getQuotationSuppliers(),
          getQuotationTeams()
        ]);

        // Format period options
        const formattedPeriods: OptionType[] = [
          { value: "all", label: "Tất cả kỳ báo giá" },
          ...periods.map(period => ({
            value: period,
            label: formatPeriodLabel(period)
          }))
        ];

        // Format supplier options
        const formattedSuppliers: OptionType[] = [
          { value: "all", label: "Tất cả nhà cung cấp" },
          ...suppliers.map(supplier => ({
            value: supplier.id.toString(),
            label: supplier.name
          }))
        ];

        // Format team options
        const formattedTeams: OptionType[] = [
          { value: "all", label: "Tất cả bếp" },
          ...teams.map(team => ({
            value: team.id.toString(),
            label: team.name
          }))
        ];

        // Get unique regions from current data (could be enhanced with separate API)
        const uniqueRegions = Array.from(new Set([
          'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng',
          'Vũng Tàu', 'Nha Trang', 'Huế', 'Quận 1', 'Quận 5', 'Quận 7',
          'Bình Thạnh', 'Thủ Đức', 'Gò Vấp', 'Phú Nhuận'
        ]));

        const formattedRegions: OptionType[] = [
          { value: "all", label: "Tất cả khu vực" },
          ...uniqueRegions.map(region => ({
            value: region,
            label: region
          }))
        ];

        // Update state
        setPeriodOptions(formattedPeriods);
        setSupplierOptions(formattedSuppliers);
        setTeamOptions(formattedTeams);
        setRegionOptions(formattedRegions);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadFilterOptions();
  }, []);

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
        <Select value={selectedPeriod} onValueChange={onPeriodChange} disabled={isLoadingOptions}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder={isLoadingOptions ? "Đang tải..." : "Kỳ báo giá"} />
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
        <Select value={selectedSupplier} onValueChange={onSupplierChange} disabled={isLoadingOptions}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder={isLoadingOptions ? "Đang tải..." : "Nhà cung cấp"} />
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
        <Select value={selectedRegion} onValueChange={onRegionChange} disabled={isLoadingOptions}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder={isLoadingOptions ? "Đang tải..." : "Khu vực"} />
          </SelectTrigger>
          <SelectContent>
            {regionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Team Filter */}
        <Select value={selectedTeam} onValueChange={onTeamChange} disabled={isLoadingOptions}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder={isLoadingOptions ? "Đang tải..." : "Bếp"} />
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

// Export static options for use in other components
export { statusOptions };