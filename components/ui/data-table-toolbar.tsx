"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DataTableToolbarProps {
  // Search functionality
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;

  // Filter slot for custom filters
  children?: React.ReactNode;

  // Clear functionality
  onClearFilters?: () => void;
  hasActiveFilters?: boolean; // Includes search (for backward compatibility)
  hasActiveFiltersOnly?: boolean; // Excludes search (for clear filters button)

  // Action buttons (e.g., Add New)
  actions?: React.ReactNode;

  // Styling
  className?: string;
}

export function DataTableToolbar({
  searchValue = "",
  searchPlaceholder = "Tìm kiếm...",
  onSearchChange,
  children,
  onClearFilters,
  hasActiveFilters = false,
  hasActiveFiltersOnly = false,
  actions,
  className,
}: DataTableToolbarProps) {
  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(event.target.value);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange("");
    }
  };

  return (
    <div className={`flex items-center justify-between ${className || ""}`}>
      {/* Left side - Search and filters */}
      <div className="flex flex-1 items-center space-x-2">
        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex items-center">
            <Search className="absolute left-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              className="h-8 w-[150px] pl-8 pr-8 lg:w-[250px]"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 h-full px-2 hover:bg-transparent"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Xóa tìm kiếm</span>
              </Button>
            )}
          </div>
        )}

        {/* Custom filter slot */}
        {children && (
          <div className="flex items-center space-x-2">{children}</div>
        )}

        {/* Clear filters button - only show when there are active filters (excluding search) */}
        {hasActiveFiltersOnly && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={onClearFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Right side - Action buttons */}
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
}

// Helper component for filter badges
interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove?: () => void;
}

export function FilterBadge({ label, value, onRemove }: FilterBadgeProps) {
  return (
    <div className="flex items-center space-x-1 rounded-md border px-2 py-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span>{value}</span>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-muted-foreground hover:text-foreground"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Xóa bộ lọc {label}</span>
        </Button>
      )}
    </div>
  );
}

// Helper component for filter dropdown wrapper
interface FilterWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterWrapper({ children, className }: FilterWrapperProps) {
  return (
    <div className={`flex items-center space-x-2 ${className || ""}`}>
      {children}
    </div>
  );
}
