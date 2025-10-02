'use client';

import { useState, useMemo } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface AssignmentItem {
  id: number;
  name: string;
  group?: string | null; // Optional grouping field (e.g., region)
}

interface ManyToManyAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: number[]) => Promise<void>;
  title: string;
  description?: string;
  items: AssignmentItem[];
  selectedIds: number[];
  groupBy?: keyof AssignmentItem; // Field to group by (e.g., 'group', 'region')
  searchPlaceholder?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function ManyToManyAssignmentModal({
  isOpen,
  onClose,
  onSave,
  title,
  description,
  items,
  selectedIds: initialSelectedIds,
  groupBy = 'group',
  searchPlaceholder = 'Tìm kiếm bếp hoặc khu vực...',
  emptyMessage = 'Không tìm thấy kết quả',
  isLoading = false,
}: ManyToManyAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(initialSelectedIds)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Reset selected IDs when modal opens with new data
  useMemo(() => {
    setSelectedIds(new Set(initialSelectedIds));
  }, [initialSelectedIds, isOpen]);

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const lowerSearch = searchTerm.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(lowerSearch) ||
      (item[groupBy] as string)?.toLowerCase().includes(lowerSearch)
    );
  }, [items, searchTerm, groupBy]);

  // Group items by the specified field
  const groupedItems = useMemo(() => {
    const groups = new Map<string, AssignmentItem[]>();

    filteredItems.forEach((item) => {
      const groupKey = (item[groupBy] as string) || 'Chưa phân loại';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    // Sort groups alphabetically
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredItems, groupBy]);

  // Toggle individual item
  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle all items in a group
  const toggleGroup = (groupItems: AssignmentItem[]) => {
    const groupIds = groupItems.map((item) => item.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all in group
        groupIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all in group
        groupIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  // Toggle all items globally
  const toggleAll = () => {
    const allIds = filteredItems.map((item) => item.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(allIds));
    }
  };

  // Check if all items in a group are selected
  const isGroupSelected = (groupItems: AssignmentItem[]) => {
    return groupItems.every((item) => selectedIds.has(item.id));
  };

  // Check if some (but not all) items in a group are selected
  const isGroupIndeterminate = (groupItems: AssignmentItem[]) => {
    const selectedCount = groupItems.filter((item) =>
      selectedIds.has(item.id)
    ).length;
    return selectedCount > 0 && selectedCount < groupItems.length;
  };

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      handleClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close and reset state
  const handleClose = () => {
    setSearchTerm('');
    setSelectedIds(new Set(initialSelectedIds));
    onClose();
  };

  const allSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const someSelected = filteredItems.some((item) => selectedIds.has(item.id)) && !allSelected;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400"
            />
          </div>

          {/* Global Select All */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
                className={someSelected ? 'data-[state=checked]:bg-primary' : ''}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Chọn tất cả
              </label>
            </div>
            <span className="text-sm text-muted-foreground">
              Đã chọn: {selectedIds.size} / {items.length}
            </span>
          </div>

          {/* Grouped List with Custom Accordion */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="h-[400px] overflow-y-auto pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
              ) : groupedItems.size === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </div>
              ) : (
                <AccordionPrimitive.Root
                  type="multiple"
                  value={openAccordions}
                  onValueChange={setOpenAccordions}
                  className="space-y-3"
                >
                {Array.from(groupedItems.entries()).map(([groupName, groupItems]) => {
                  const groupSelected = isGroupSelected(groupItems);
                  const groupIndeterminate = isGroupIndeterminate(groupItems);
                  const selectedCount = groupItems.filter((item) => selectedIds.has(item.id)).length;

                  const handleMouseEnter = () => {
                    if (!openAccordions.includes(groupName)) {
                      setOpenAccordions([...openAccordions, groupName]);
                    }
                  };

                  const handleMouseLeave = () => {
                    setOpenAccordions(openAccordions.filter(name => name !== groupName));
                  };

                  return (
                    <AccordionPrimitive.Item
                      key={groupName}
                      value={groupName}
                      className="bg-white border rounded-lg overflow-hidden shadow-sm"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* Custom Accordion Header to avoid button nesting */}
                      <AccordionPrimitive.Header className="flex">
                        <div className="flex items-center w-full px-4 py-3 gap-3">
                          {/* Checkbox - NOT nested in trigger */}
                          <Checkbox
                            checked={groupSelected}
                            onCheckedChange={() => toggleGroup(groupItems)}
                            onClick={(e) => e.stopPropagation()}
                            className={groupIndeterminate ? 'data-[state=checked]:bg-primary' : ''}
                          />

                          {/* Accordion Trigger - separate from checkbox */}
                          <AccordionPrimitive.Trigger className="flex items-center justify-between flex-1 group outline-none">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium group-hover:text-primary group-data-[state=open]:font-semibold transition-all">
                                {groupName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({selectedCount}/{groupItems.length} đã chọn)
                              </span>
                            </div>

                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </AccordionPrimitive.Trigger>
                        </div>
                      </AccordionPrimitive.Header>

                      {/* Accordion Content */}
                      <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                        <div className="px-4 pb-3 pt-1 bg-slate-50/50">
                          <div className="space-y-1.5 pl-8">
                            {groupItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center space-x-3 py-2 px-3 hover:bg-white rounded-md cursor-pointer transition-colors"
                                onClick={() => toggleItem(item.id)}
                              >
                                <Checkbox
                                  id={`item-${item.id}`}
                                  checked={selectedIds.has(item.id)}
                                  onCheckedChange={() => toggleItem(item.id)}
                                />
                                <label
                                  htmlFor={`item-${item.id}`}
                                  className="text-sm flex-1 cursor-pointer"
                                >
                                  {item.name}
                                </label>
                                {selectedIds.has(item.id) && (
                                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionPrimitive.Content>
                    </AccordionPrimitive.Item>
                  );
                })}
              </AccordionPrimitive.Root>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
