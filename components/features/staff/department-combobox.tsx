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
import { DEPARTMENT_OPTIONS } from "@/lib/utils/departments";

interface DepartmentComboboxProps {
  value?: string;
  onChange: (department: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DepartmentCombobox({
  value,
  onChange,
  placeholder = "Chọn phòng ban...",
  disabled = false,
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter departments based on search query
  const filteredDepartments = React.useMemo(() => {
    if (!searchQuery.trim()) return DEPARTMENT_OPTIONS;

    const query = searchQuery.toLowerCase().trim();
    return DEPARTMENT_OPTIONS.filter((department) =>
      department.label.toLowerCase().includes(query) ||
      department.value.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle department selection
  const handleSelect = (selectedValue: string) => {
    if (selectedValue !== value) {
      onChange(selectedValue);
    }
    setOpen(false);
    setSearchQuery("");
  };

  // Handle search input change
  const handleSearchChange = (searchValue: string) => {
    setSearchQuery(searchValue);
  };

  // Get display label for selected value
  const getDisplayLabel = (val: string) => {
    const department = DEPARTMENT_OPTIONS.find(d => d.value === val);
    return department ? department.label : val;
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
          disabled={disabled}
        >
          {value ? getDisplayLabel(value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm kiếm phòng ban..."
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-3 px-2 text-sm text-muted-foreground">
                Không tìm thấy phòng ban phù hợp
              </div>
            </CommandEmpty>

            {filteredDepartments.length > 0 && (
              <CommandGroup>
                {filteredDepartments.map((department) => (
                  <CommandItem
                    key={department.value}
                    value={department.value}
                    onSelect={() => handleSelect(department.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === department.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {department.label}
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