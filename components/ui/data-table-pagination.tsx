'use client';

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showRowsInfo?: boolean;
  className?: string;
}

export function DataTablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showRowsInfo = true,
  className,
}: DataTablePaginationProps) {
  const { page, limit, total, pages } = pagination;

  // Calculate display information
  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total);

  // Navigation handlers
  const goToFirstPage = () => onPageChange(1);
  const goToPrevPage = () => onPageChange(Math.max(1, page - 1));
  const goToNextPage = () => onPageChange(Math.min(pages, page + 1));
  const goToLastPage = () => onPageChange(pages);

  // Page size change handler
  const handlePageSizeChange = (newPageSize: string) => {
    if (onPageSizeChange) {
      onPageSizeChange(parseInt(newPageSize));
    }
  };

  return (
    <div className={`flex items-center justify-between px-2 ${className || ''}`}>
      {/* Left side - Rows info and page size selector */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Hiển thị</p>
            <Select
              value={limit.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm font-medium">dòng</p>
          </div>
        )}

        {/* Rows information */}
        {showRowsInfo && (
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            {total === 0 ? (
              'Không có dữ liệu'
            ) : (
              `${startRow}-${endRow} trong ${total}`
            )}
          </div>
        )}
      </div>

      {/* Right side - Navigation controls */}
      <div className="flex items-center space-x-2">
        {/* Page info */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {pages === 0 ? (
            'Trang 0 / 0'
          ) : (
            `Trang ${page} / ${pages}`
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={goToFirstPage}
            disabled={page <= 1 || pages === 0}
            title="Trang đầu"
          >
            <span className="sr-only">Trang đầu</span>
            <ChevronFirst className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={goToPrevPage}
            disabled={page <= 1 || pages === 0}
            title="Trang trước"
          >
            <span className="sr-only">Trang trước</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Next page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={goToNextPage}
            disabled={page >= pages || pages === 0}
            title="Trang sau"
          >
            <span className="sr-only">Trang sau</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={goToLastPage}
            disabled={page >= pages || pages === 0}
            title="Trang cuối"
          >
            <span className="sr-only">Trang cuối</span>
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}