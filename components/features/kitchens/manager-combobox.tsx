'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getKitchenManagers } from '@/lib/actions/kitchen.actions';

// Manager data type for component
interface Manager {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ManagerComboboxProps {
  value?: number;
  onChange: (managerId: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ManagerCombobox({
  value,
  onChange,
  placeholder = 'Chọn quản lý...',
  disabled = false,
  className,
}: ManagerComboboxProps) {
  // Component state
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch managers data on component mount
  useEffect(() => {
    async function fetchManagers() {
      setLoading(true);
      setError(null);

      try {
        const result = await getKitchenManagers();

        if ('error' in result) {
          setError(result.error);
          setManagers([]);
        } else {
          setManagers(result);
        }
      } catch (err) {
        console.error('Error fetching managers:', err);
        setError('Có lỗi xảy ra khi tải danh sách quản lý');
        setManagers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchManagers();
  }, []);

  // Find selected manager
  const selectedManager = useMemo(() => {
    if (!value) return null;
    return managers.find(manager => manager.id === value) || null;
  }, [value, managers]);

  // Filter managers based on search query - FIXED CLIENT-SIDE FILTERING
  const filteredManagers = useMemo(() => {
    if (!searchQuery.trim()) return managers;

    const query = searchQuery.toLowerCase().trim();
    return managers.filter(manager =>
      manager.name.toLowerCase().includes(query) ||
      manager.email.toLowerCase().includes(query) ||
      manager.role.toLowerCase().includes(query)
    );
  }, [managers, searchQuery]);

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

  // Handle search input change - FIXED TO UPDATE SEARCH QUERY
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Reset search when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery(''); // Clear search when closing
    }
  };

  // Render display value
  const renderDisplayValue = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Đang tải...</span>
        </div>
      );
    }

    if (error) {
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
              <span className="text-sm font-medium">{selectedManager.name}</span>
              <span className="text-xs text-muted-foreground">{selectedManager.email}</span>
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
          <span className="text-sm font-medium truncate">{manager.name}</span>
          <span className="text-xs text-muted-foreground truncate">{manager.email}</span>
          <span className="text-xs text-muted-foreground/70 capitalize">{manager.role}</span>
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
          disabled={disabled || loading}
        >
          {renderDisplayValue()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm kiếm quản lý..."
            className="h-9"
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Đang tải danh sách quản lý...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-medium mb-1">Lỗi tải dữ liệu</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setError(null);
                    // Re-trigger fetch
                    const fetchManagers = async () => {
                      setLoading(true);
                      try {
                        const result = await getKitchenManagers();
                        if ('error' in result) {
                          setError(result.error);
                          setManagers([]);
                        } else {
                          setManagers(result);
                        }
                      } catch (err) {
                        setError('Có lỗi xảy ra khi tải danh sách quản lý');
                        setManagers([]);
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchManagers();
                  }}
                >
                  Thử lại
                </Button>
              </div>
            ) : filteredManagers.length === 0 ? (
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
                {filteredManagers.map((manager) => {
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
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}