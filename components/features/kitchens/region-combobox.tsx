"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
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

interface RegionComboboxProps {
  regions: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RegionCombobox({
  regions,
  value,
  onChange,
  placeholder = "Chọn khu vực...",
  disabled = false,
}: RegionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Handle selection from the list
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  // Handle custom input from search
  const handleCustomInput = (inputValue: string) => {
    if (inputValue.trim() && !regions.includes(inputValue.trim())) {
      onChange(inputValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  // Handle Enter key in search input
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && searchValue.trim()) {
      event.preventDefault();
      handleCustomInput(searchValue);
    }
  };

  // Filter regions based on search
  const filteredRegions = regions.filter((region) =>
    region.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Determine if we should show "Create new" option
  const showCreateNew = searchValue.trim() &&
    !filteredRegions.some((region) => region.toLowerCase() === searchValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Tìm kiếm khu vực..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandGroup>
              {/* Show filtered existing regions */}
              {filteredRegions.map((region) => (
                <CommandItem
                  key={region}
                  value={region}
                  onSelect={() => handleSelect(region)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === region ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{region}</span>
                </CommandItem>
              ))}

              {/* Show "Create new" option when applicable */}
              {showCreateNew && (
                <CommandItem
                  onSelect={() => handleCustomInput(searchValue)}
                  className="cursor-pointer border-t"
                >
                  <div className="flex flex-col">
                    <span>Tạo mới: "{searchValue}"</span>
                    <span className="text-xs text-muted-foreground">
                      Thêm khu vực mới
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>

            {/* Show empty state only when no results and no create option */}
            {filteredRegions.length === 0 && !showCreateNew && (
              <CommandEmpty>Không tìm thấy khu vực nào.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}