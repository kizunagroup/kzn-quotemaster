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
import { getProductCategories } from "@/lib/actions/product.actions";

interface CategoryComboboxProps {
  value?: string;
  onChange: (category: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Chọn hoặc nhập nhóm hàng...",
  disabled = false,
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Internal search state - this prevents infinite loops
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch categories data on component mount
  React.useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      setError(null);

      try {
        const result = await getProductCategories();

        if (Array.isArray(result)) {
          setCategories(result);
        } else {
          setError(result.error || "Failed to load categories");
          setCategories([]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Có lỗi xảy ra khi tải danh sách nhóm hàng");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Filter categories based on search query
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase().trim();
    return categories.filter((category) =>
      category.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Check if current search query would create a new category
  const isNewCategory = React.useMemo(() => {
    if (!searchQuery.trim()) return false;
    return !categories.some((category) =>
      category.toLowerCase() === searchQuery.toLowerCase().trim()
    );
  }, [categories, searchQuery]);

  // Handle category selection (existing category)
  const handleSelectExisting = (selectedCategory: string) => {
    if (selectedCategory !== value) {
      onChange(selectedCategory);
    }
    setOpen(false);
    setSearchQuery("");
  };

  // Handle creating new category
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
            placeholder="Tìm kiếm hoặc nhập nhóm hàng mới..."
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Đang tải danh sách nhóm hàng...
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
                    Không tìm thấy nhóm hàng phù hợp
                  </div>
                </CommandEmpty>

                {/* Show "Create New" option when search query is not empty and is new */}
                {searchQuery.trim() && isNewCategory && (
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

                {/* Existing categories */}
                {filteredCategories.length > 0 && (
                  <CommandGroup>
                    {filteredCategories.map((category) => (
                      <CommandItem
                        key={category}
                        value={category}
                        onSelect={() => handleSelectExisting(category)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === category ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {category}
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