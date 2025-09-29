"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { getAvailableRegions } from "@/lib/actions/quotations.actions";

export interface RegionAutocompleteProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function RegionAutocomplete({
  value,
  onValueChange,
  placeholder = "Chọn khu vực...",
  disabled = false,
  className,
  id,
  name,
}: RegionAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch regions on component mount
  React.useEffect(() => {
    async function fetchRegions() {
      try {
        setLoading(true);
        setError(null);
        const availableRegions = await getAvailableRegions();
        setRegions(availableRegions);
      } catch (err) {
        console.error("Error fetching regions:", err);
        setError("Không thể tải danh sách khu vực");
        setRegions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRegions();
  }, []);

  // Find the display value for the selected region
  const selectedRegion = regions.find((region) => region === value);

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
          id={id}
          name={name}
        >
          {loading ? (
            "Đang tải..."
          ) : error ? (
            "Lỗi tải dữ liệu"
          ) : selectedRegion ? (
            selectedRegion
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm kiếm khu vực..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Đang tải..." : error ? error : "Không tìm thấy khu vực."}
            </CommandEmpty>
            {!loading && !error && regions.length > 0 && (
              <CommandGroup>
                {regions.map((region) => (
                  <CommandItem
                    key={region}
                    value={region}
                    onSelect={(currentValue) => {
                      // Find the exact region match (case-insensitive)
                      const exactRegion = regions.find(
                        (r) => r.toLowerCase() === currentValue.toLowerCase()
                      );

                      if (exactRegion) {
                        const newValue = exactRegion === value ? "" : exactRegion;
                        onValueChange?.(newValue);
                        setOpen(false);
                      }
                    }}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Helper hook for easy integration with react-hook-form
export function useRegionAutocomplete() {
  const [regions, setRegions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchRegions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const availableRegions = await getAvailableRegions();
      setRegions(availableRegions);
    } catch (err) {
      console.error("Error fetching regions:", err);
      setError("Không thể tải danh sách khu vực");
      setRegions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    loading,
    error,
    refetch: fetchRegions,
  };
}

export default RegionAutocomplete;