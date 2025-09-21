'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps {
  title: string;
  column?: {
    getIsSorted: () => false | 'asc' | 'desc';
    getCanSort: () => boolean;
    toggleSorting: (desc?: boolean) => void;
  };
  onSort?: (direction: 'asc' | 'desc' | null) => void;
  className?: string;
  sortable?: boolean;
}

export function DataTableColumnHeader({
  title,
  column,
  onSort,
  className,
  sortable = true,
}: DataTableColumnHeaderProps) {
  // Get current sort state
  const sortDirection = column?.getIsSorted() || false;
  const canSort = column?.getCanSort() ?? sortable;

  // Handle sort click
  const handleSort = () => {
    if (!canSort) return;

    if (column) {
      // TanStack Table integration
      column.toggleSorting(sortDirection === 'asc');
    } else if (onSort) {
      // Custom sort handler
      let newDirection: 'asc' | 'desc' | null = 'asc';

      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }

      onSort(newDirection);
    }
  };

  // Render sort icon based on current state
  const renderSortIcon = () => {
    if (!canSort) return null;

    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }

    if (sortDirection === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />;
    }

    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
  };

  // If not sortable, render as plain text
  if (!canSort) {
    return (
      <div className={cn('text-left font-medium', className)}>
        {title}
      </div>
    );
  }

  // Render sortable header with button
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 data-[state=open]:bg-accent flex items-center justify-start px-0 font-medium hover:bg-accent/50',
        sortDirection && 'text-accent-foreground',
        className
      )}
      onClick={handleSort}
    >
      <span>{title}</span>
      {renderSortIcon()}
    </Button>
  );
}