"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRegions } from "@/lib/actions/kitchen.actions";

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
  placeholder = "Chọn hoặc nhập khu vực...",
  disabled = false,
  className,
}: RegionComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Internal search state - this prevents infinite loops
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch regions data on component mount
  React.useEffect(() => {
    async function fetchRegions() {
      setLoading(true);
      setError(null);

      try {
        const result = await getRegions();

        if (Array.isArray(result)) {
          setRegions(result);
        } else {
          setError(result.error || "Failed to load regions");
          setRegions([]);
        }
      } catch (err) {
        console.error("Error fetching regions:", err);
        setError("Có lỗi xảy ra khi tải danh sách khu vực");
        setRegions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, []);

  // Filter regions based on search query
  const filteredRegions = React.useMemo(() => {
    if (!searchQuery.trim()) return regions;

    const query = searchQuery.toLowerCase().trim();
    return regions.filter((region) =>
      region.toLowerCase().includes(query)
    );
  }, [regions, searchQuery]);

  // Check if current search query would create a new region
  const isNewRegion = React.useMemo(() => {
    if (!searchQuery.trim()) return false;
    return !regions.some((region) =>
      region.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [regions, searchQuery]);

  // Handle region selection (existing region)
  const handleSelectExisting = (selectedRegion: string) => {
    if (selectedRegion !== value) {
      onChange(selectedRegion);
    }
    setOpen(false);
    setSearchQuery("");
  };

  // Handle creating new region
  const handleCreateNew = () => {
    if (searchQuery.trim() && searchQuery.trim() !== value) {
      onChange(searchQuery.trim());
      setOpen(false);
      setSearchQuery("");
    }
  };

  // Handle search input change - only update internal state, never call onChange
  const handleSearchChange = (searchValue: string) => {
    setSearchQuery(searchValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
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
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Đang tải danh sách khu vực...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-medium mb-1">
                  Lỗi tải dữ liệu
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-3 px-2 text-sm text-muted-foreground">
                    Không tìm thấy khu vực phù hợp
                  </div>
                </CommandEmpty>

                {/* Show "Create New" option when search query is not empty and is new */}
                {searchQuery.trim() && isNewRegion && (
                  <CommandGroup>
                    <CommandItem
                      value={`create-new-${searchQuery}`}
                      onSelect={handleCreateNew}
                      className="flex items-center py-3 px-2 cursor-pointer text-blue-600 font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo mới: "{searchQuery.trim()}"
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Existing regions */}
                {filteredRegions.length > 0 && (
                  <CommandGroup>
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