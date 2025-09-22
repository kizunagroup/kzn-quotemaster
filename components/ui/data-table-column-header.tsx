'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps {
  title: string;
  column: {
    getIsSorted: () => false | 'asc' | 'desc';
    getCanSort: () => boolean;
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
  };
  className?: string;
}

export function DataTableColumnHeader({
  title,
  column,
  className,
}: DataTableColumnHeaderProps) {
  // Get current sort state and capabilities from TanStack Table
  const sortDirection = column.getIsSorted();
  const canSort = column.getCanSort();
  const toggleSorting = column.getToggleSortingHandler();

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

  // Render sortable header with button using TanStack's built-in handler
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 data-[state=open]:bg-accent flex items-center justify-start px-0 font-medium hover:bg-accent/50',
        sortDirection && 'text-accent-foreground',
        className
      )}
      onClick={toggleSorting}
    >
      <span>{title}</span>
      {renderSortIcon()}
    </Button>
  );
}