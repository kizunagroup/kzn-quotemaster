"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { Plus, Settings2, Upload, Download, FileDown } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { toast } from "sonner";
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
import { exportProductsToExcel } from "@/lib/actions/product.actions";
import type { Product } from "@/lib/hooks/use-products";

// Single source of truth for status options - STANDARDIZED
const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt Động" },
  { value: "inactive", label: "Tạm Dừng" },
] as const;

interface ProductsTableToolbarProps {
  // Search props
  searchValue?: string;
  onSearchChange: (value: string) => void;

  // Filter props
  selectedCategory?: string;
  onCategoryChange: (value: string) => void;
  selectedStatus?: string;
  onStatusChange: (value: string) => void;

  // Filter state
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  hasActiveFiltersOnly?: boolean;

  // Table instance for column visibility
  table: Table<Product>;

  // Actions
  onCreateClick: () => void;
  onImportClick: () => void;
}

export function ProductsTableToolbar({
  searchValue = "",
  onSearchChange,
  selectedCategory = "all",
  onCategoryChange,
  selectedStatus = "all",
  onStatusChange,
  onClearFilters,
  hasActiveFilters,
  hasActiveFiltersOnly = false,
  table,
  onCreateClick,
  onImportClick,
}: ProductsTableToolbarProps) {
  // Local state for search input to enable debouncing
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Category state - dynamic loading from database
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Export loading state
  const [isExporting, setIsExporting] = useState(false);

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

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const { getProductCategories } = await import("@/lib/actions/product.actions");
        const result = await getProductCategories();
        if (Array.isArray(result)) {
          setCategories(result);
        } else {
          console.error("Failed to fetch categories:", result.error);
          setCategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle local search input change
  const handleLocalSearchChange = (value: string) => {
    setLocalSearchValue(value);
  };

  // Handle export products
  const handleExportProducts = async () => {
    setIsExporting(true);
    try {
      // Get current filter state
      const filters = {
        search: searchValue || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

      const result = await exportProductsToExcel(filters);

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      // Convert Base64 string back to Blob
      const blob = await (await fetch(
        `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.base64}`
      )).blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename with filters info
      const filterSuffix = hasActiveFilters ? '_Filtered' : '';
      link.download = `Danh_Sach_Hang_Hoa${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Đã xuất dữ liệu thành công');
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu');
    } finally {
      setIsExporting(false);
    }
  };

  // Build category options dynamically
  const categoryOptions = [
    { value: "all", label: "Tất cả nhóm hàng" },
    ...categories.map((category) => ({
      value: category,
      label: category,
    })),
  ];

  return (
    <DataTableToolbar
      searchValue={localSearchValue}
      searchPlaceholder="Tìm kiếm theo tên, mã hàng..."
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

          {/* Create Button */}
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Hàng hóa
          </Button>

          {/* Import Button */}
          <Button variant="outline" onClick={onImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>

          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExportProducts}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Đang xuất...' : 'Export'}
          </Button>
        </div>
      }
    >
      {/* Category Filter - Dynamic Loading */}
      <Select
        value={selectedCategory}
        onValueChange={onCategoryChange}
        disabled={categoriesLoading}
      >
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue
            placeholder={categoriesLoading ? "Đang tải..." : "Nhóm hàng"}
          />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((option) => (
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
    productCode: "Mã hàng",
    name: "Tên hàng",
    specification: "Quy cách",
    unit: "Đvt",
    category: "Nhóm hàng",
    basePrice: "Giá cơ sở",
    baseQuantity: "Số lượng cơ sở",
    status: "Trạng thái",
    createdAt: "Ngày tạo",
  };

  return columnNames[columnId] || columnId;
}

// Export options for use in other components
export { statusOptions };
