"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, ChevronLeft, ChevronRight, Edit, PowerOff } from 'lucide-react';

// Type definition for kitchen data based on the getKitchens return type
interface Kitchen {
  id: number;
  kitchenCode: string | null;
  name: string;
  region: string | null;
  address: string | null;
  managerName: string | null;
  phone: string | null;
  email: string | null;
  teamType: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface KitchenDataTableProps {
  data: Kitchen[];
  onEdit: (kitchen: Kitchen) => void;
  onDelete: (kitchen: Kitchen) => void;
}

export interface KitchenDataTableRef {
  openAddModal: () => void;
}

const ITEMS_PER_PAGE = 10;

export const KitchenDataTable = React.forwardRef<KitchenDataTableRef, KitchenDataTableProps>(({ data, onEdit, onDelete }, ref) => {
  console.log('📱 [COMPONENT] KitchenDataTable rendered', { dataCount: data.length, hasOnEdit: !!onEdit, hasOnDelete: !!onDelete });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term (kitchen name)
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((kitchen) =>
      kitchen.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleEdit = (kitchen: Kitchen) => {
    console.log('📱 [COMPONENT] User action', { action: 'edit_click', kitchenId: kitchen.id });
    onEdit(kitchen);
  };

  const handleDeactivate = (kitchen: Kitchen) => {
    console.log('📱 [COMPONENT] User action', { action: 'delete_click', kitchenId: kitchen.id });
    onDelete(kitchen);
  };

  const handleAddNew = () => {
    console.log('📱 [COMPONENT] User action', { action: 'add_click' });
    // This functionality is now handled by parent via imperative handle
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Expose add functionality to parent via imperative handle
  React.useImperativeHandle(ref, () => ({
    openAddModal: handleAddNew,
  }));

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên bếp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Hiển thị {currentData.length} / {filteredData.length} bếp
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã bếp</TableHead>
              <TableHead>Tên bếp</TableHead>
              <TableHead>Khu vực</TableHead>
              <TableHead>Địa chỉ</TableHead>
              <TableHead>Quản lý</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  {searchTerm ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        Không tìm thấy bếp nào với từ khóa "{searchTerm}"
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                      >
                        Xóa bộ lọc
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Chưa có dữ liệu bếp nào.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((kitchen) => (
                <TableRow key={kitchen.id}>
                  <TableCell className="font-medium">
                    {kitchen.kitchenCode || 'N/A'}
                  </TableCell>
                  <TableCell>{kitchen.name}</TableCell>
                  <TableCell>{kitchen.region || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {kitchen.address || 'N/A'}
                  </TableCell>
                  <TableCell>{kitchen.managerName || 'N/A'}</TableCell>
                  <TableCell>{kitchen.phone || 'N/A'}</TableCell>
                  <TableCell>{kitchen.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="success">
                      Hoạt động
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(kitchen)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeactivate(kitchen)}
                          className="cursor-pointer text-red-600"
                        >
                          <PowerOff className="mr-2 h-4 w-4" />
                          Ngưng hoạt động
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Trang {currentPage} / {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>

            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

KitchenDataTable.displayName = "KitchenDataTable";