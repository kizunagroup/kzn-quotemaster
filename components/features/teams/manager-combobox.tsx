'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, X, User, Loader2, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getStaffManagers } from '@/lib/actions/staff.actions';

// Helper function to display department names in Vietnamese
const getDepartmentDisplay = (department: string | null): string => {
  if (!department) return 'Chưa có phòng ban';

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
    case 'GENERAL':
      return 'Tổng Hợp';
    default:
      return department;
  }
};

// Manager data type for component
interface Manager {
  id: number;
  name: string;
  email: string;
  employeeCode: string | null;
  department: string | null;
  jobTitle: string | null;
  role: string;
}

interface ManagerComboboxProps {
  value?: number;
  onChange: (managerId: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  initialValue?: {
    id: number;
    name: string;
    email: string;
    employeeCode?: string | null;
    department?: string | null;
    jobTitle?: string | null;
  } | null;
}

export function ManagerCombobox({
  value,
  onChange,
  placeholder = 'Chọn quản lý...',
  disabled = false,
  className,
  initialValue,
}: ManagerComboboxProps) {
  // Component state
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // PERFORMANCE OPTIMIZATION: Debounced search (300ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // PERFORMANCE OPTIMIZATION: Fetch managers with server-side search
  const fetchManagers = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getStaffManagers(search?.trim() || undefined);

      if ('error' in result) {
        setError(result.error);
        setManagers([]);
      } else {
        // Validate and sanitize manager data to prevent runtime errors
        let validManagers = (result || []).filter(manager =>
          manager &&
          typeof manager === 'object' &&
          typeof manager.id === 'number'
        ).map(manager => ({
          id: manager.id,
          name: manager.name || '',
          email: manager.email || '',
          employeeCode: manager.employeeCode || null,
          department: manager.department || null,
          jobTitle: manager.jobTitle || null,
          role: manager.role || ''
        }));

        // Include initialValue if it exists and is not already in the list
        if (initialValue && !validManagers.find(m => m.id === initialValue.id)) {
          const initialManager: Manager = {
            id: initialValue.id,
            name: initialValue.name,
            email: initialValue.email,
            employeeCode: initialValue.employeeCode || null,
            department: initialValue.department || null,
            jobTitle: initialValue.jobTitle || null,
            role: 'manager' // Default role for initial value
          };
          validManagers = [initialManager, ...validManagers];
        }

        setManagers(validManagers);

        // Debug logging for development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 ManagerCombobox Debug:');
          console.log('- Search term:', search);
          console.log('- Managers received:', validManagers.length);
          console.log('- Sample manager:', validManagers[0] ? {
            id: validManagers[0].id,
            name: validManagers[0].name,
            email: validManagers[0].email,
            employeeCode: validManagers[0].employeeCode,
            department: validManagers[0].department,
            jobTitle: validManagers[0].jobTitle,
            role: validManagers[0].role
          } : 'No managers found');
        }
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
      setError('Có lỗi xảy ra khi tải danh sách quản lý');
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [initialValue]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // PERFORMANCE OPTIMIZATION: Re-fetch when debounced search changes
  useEffect(() => {
    if (open) { // Only search when dropdown is open
      fetchManagers(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, open, fetchManagers]);

  // Find selected manager - prioritize from managers list, fallback to initialValue
  const selectedManager = useMemo(() => {
    if (!value) return null;

    // First try to find in the current managers list
    const managerFromList = managers.find(manager => manager.id === value);
    if (managerFromList) return managerFromList;

    // Fallback to initialValue if it matches the selected value
    if (initialValue && initialValue.id === value) {
      return {
        id: initialValue.id,
        name: initialValue.name,
        email: initialValue.email,
        employeeCode: initialValue.employeeCode || null,
        department: initialValue.department || null,
        jobTitle: initialValue.jobTitle || null,
        role: 'manager'
      };
    }

    return null;
  }, [value, managers, initialValue]);

  // Handle manager selection
  const handleSelect = (managerId: string) => {
    const selectedId = parseInt(managerId);

    // Toggle selection - if same manager is selected, clear it
    if (selectedId === value) {
      onChange(undefined);
    } else {
      onChange(selectedId);
    }

    setOpen(false);
    setSearchQuery(''); // Clear search when selection is made
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(undefined);
  };

  // PERFORMANCE OPTIMIZATION: Handle search input change (triggers debounced server search)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // The debounced effect will handle the actual server search
  };

  // Reset search when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery(''); // Clear search when closing
      // Reset to initial state without search
      if (debouncedSearchQuery) {
        setDebouncedSearchQuery('');
      }
    }
  };

  // Render display value
  const renderDisplayValue = () => {
    if (loading && !managers.length) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Đang tải...</span>
        </div>
      );
    }

    if (error && !managers.length) {
      return (
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Lỗi tải dữ liệu</span>
        </div>
      );
    }

    if (selectedManager) {
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{selectedManager.name || 'Không có tên'}</span>
              <span className="text-xs text-muted-foreground">{selectedManager.email || 'Không có email'}</span>
              <div className="flex gap-1 text-xs text-muted-foreground">
                {selectedManager.employeeCode && (
                  <>
                    <span className="font-mono">{selectedManager.employeeCode}</span>
                    <span>|</span>
                  </>
                )}
                <span>{getDepartmentDisplay(selectedManager.department)}</span>
                {selectedManager.jobTitle && (
                  <>
                    <span>|</span>
                    <span>{selectedManager.jobTitle}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!disabled && (
            <span
              className="inline-flex items-center justify-center h-auto p-1 cursor-pointer hover:bg-accent rounded-sm"
              onClick={handleClear}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Xóa lựa chọn</span>
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{placeholder}</span>
      </div>
    );
  };

  // Render manager option
  const renderManagerOption = (manager: Manager, isSelected: boolean) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{manager.name || 'Không có tên'}</span>
          <span className="text-xs text-muted-foreground truncate">{manager.email || 'Không có email'}</span>
          <div className="flex gap-1 text-xs text-muted-foreground/70">
            {manager.employeeCode && (
              <>
                <span className="font-mono shrink-0">{manager.employeeCode}</span>
                <span>|</span>
              </>
            )}
            <span className="truncate">{getDepartmentDisplay(manager.department)}</span>
            {manager.jobTitle && (
              <>
                <span>|</span>
                <span className="truncate">{manager.jobTitle}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Check
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isSelected ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );

  // PERFORMANCE OPTIMIZATION: Loading indicator for search in progress
  const isSearching = loading && (searchQuery !== debouncedSearchQuery);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-auto py-2 px-3',
            !selectedManager && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {renderDisplayValue()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[480px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder="Tìm kiếm theo tên, email, mã NV, phòng ban, chức danh..."
              className="h-9"
              value={searchQuery}
              onValueChange={handleSearchChange}
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <CommandList>
            {loading && !isSearching && managers.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Đang tải danh sách quản lý...</span>
              </div>
            ) : error && managers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-medium mb-1">Lỗi tải dữ liệu</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fetchManagers()}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Đang tải...
                    </>
                  ) : (
                    'Thử lại'
                  )}
                </Button>
              </div>
            ) : managers.length === 0 ? (
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <User className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim()
                      ? 'Không tìm thấy quản lý phù hợp'
                      : 'Không có quản lý nào khả dụng'
                    }
                  </p>
                  {searchQuery.trim() && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Thử tìm kiếm với từ khóa khác
                    </p>
                  )}
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {managers.map((manager) => {
                  const isSelected = value === manager.id;
                  return (
                    <CommandItem
                      key={manager.id}
                      value={manager.id.toString()}
                      onSelect={handleSelect}
                      className="p-3 cursor-pointer"
                    >
                      {renderManagerOption(manager, isSelected)}
                    </CommandItem>
                  );
                })}
                {managers.length >= 50 && (
                  <div className="p-2 text-center">
                    <p className="text-xs text-muted-foreground">
                      Hiển thị 50 kết quả đầu tiên. Sử dụng tìm kiếm để thu hẹp kết quả.
                    </p>
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}