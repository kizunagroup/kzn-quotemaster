'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, AlertCircle } from 'lucide-react';

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
import { getRegions } from '@/lib/actions/kitchen.actions';

interface RegionComboboxProps {
  value?: string;
  onChange: (region: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RegionCombobox({
  value,
  onChange,
  placeholder = 'Chọn hoặc nhập khu vực...',
  disabled = false,
  className,
}: RegionComboboxProps) {
  // Component state
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch regions data on component mount
  useEffect(() => {
    async function fetchRegions() {
      setLoading(true);
      setError(null);

      try {
        const result = await getRegions();

        if (Array.isArray(result)) {
          setRegions(result);
        } else {
          setError(result.error);
          setRegions([]);
        }
      } catch (err) {
        console.error('Error fetching regions:', err);
        setError('Có lỗi xảy ra khi tải danh sách khu vực');
        setRegions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, []);

  // Filter regions based on search query
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regions;

    const query = searchQuery.toLowerCase().trim();
    return regions.filter(region =>
      region.toLowerCase().includes(query)
    );
  }, [regions, searchQuery]);

  // Check if current search query would create a new region
  const isNewRegion = useMemo(() => {
    if (!searchQuery.trim()) return false;
    return !regions.some(region =>
      region.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [regions, searchQuery]);

  // Handle region selection (existing region)
  const handleSelectExisting = (selectedRegion: string) => {
    onChange(selectedRegion);
    setOpen(false);
    setSearchQuery('');
  };

  // Handle creating new region
  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setOpen(false);
      setSearchQuery('');
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Handle Enter key for creating new region
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim() && isNewRegion) {
        handleCreateNew();
      }
    }
  };

  // Reset search when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery('');
    }
  };

  // Initialize search with current value when opening
  const handlePopoverOpen = () => {
    setOpen(true);
    if (value) {
      setSearchQuery(value);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled || loading}
          onClick={handlePopoverOpen}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải...
            </>
          ) : (
            value || placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm kiếm hoặc nhập khu vực mới..."
            value={searchQuery}
            onValueChange={handleSearchChange}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Đang tải danh sách khu vực...</span>
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
                    const fetchRegions = async () => {
                      setLoading(true);
                      try {
                        const result = await getRegions();
                        if (Array.isArray(result)) {
                          setRegions(result);
                        } else {
                          setError(result.error);
                          setRegions([]);
                        }
                      } catch (err) {
                        setError('Có lỗi xảy ra khi tải danh sách khu vực');
                        setRegions([]);
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchRegions();
                  }}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {searchQuery.trim() && isNewRegion ? (
                    <CommandItem
                      value={`create-new-${searchQuery}`}
                      onSelect={handleCreateNew}
                      className="flex items-center py-3 px-2 cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <div className="w-4 h-4 mr-2 rounded border-2 border-primary flex items-center justify-center bg-primary/10">
                          <Plus className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Tạo mới: "{searchQuery.trim()}"</div>
                          <div className="text-xs text-muted-foreground">Nhấn Enter hoặc click để tạo khu vực mới</div>
                        </div>
                      </div>
                    </CommandItem>
                  ) : (
                    <div className="py-3 px-2 text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? 'Không tìm thấy khu vực phù hợp'
                        : 'Nhập tên khu vực để tạo mới'
                      }
                    </div>
                  )}
                </CommandEmpty>

                {/* Show "Create New" option when applicable */}
                {searchQuery.trim() && isNewRegion && filteredRegions.length > 0 && (
                  <CommandGroup heading="Tạo mới">
                    <CommandItem
                      value={`create-new-${searchQuery}`}
                      onSelect={handleCreateNew}
                      className="flex items-center py-3 px-2 cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <div className="w-4 h-4 mr-2 rounded border-2 border-primary flex items-center justify-center bg-primary/10">
                          <Plus className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Tạo mới: "{searchQuery.trim()}"</div>
                          <div className="text-xs text-muted-foreground">Nhấn Enter hoặc click để tạo khu vực mới</div>
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Existing regions */}
                {filteredRegions.length > 0 && (
                  <CommandGroup heading={searchQuery.trim() && isNewRegion ? "Khu vực hiện có" : undefined}>
                    {filteredRegions.map((region) => (
                      <CommandItem
                        key={region}
                        value={region}
                        onSelect={() => handleSelectExisting(region)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === region ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {region}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}