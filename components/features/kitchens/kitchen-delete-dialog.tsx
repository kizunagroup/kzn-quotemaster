"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { deleteKitchen } from '@/lib/actions/kitchen.actions';

// Type for kitchen data (matches the getKitchens return type)
interface KitchenData {
  id: number;
  kitchenCode: string | null;
  name: string;
  region: string | null;
  address: string | null;
  managerName: string | null;
  phone: string | null;
  email: string | null;
  teamType: string | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface KitchenDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kitchen: KitchenData | null;
  onSuccess?: () => void;
}

export function KitchenDeleteDialog({
  isOpen,
  onClose,
  kitchen,
  onSuccess,
}: KitchenDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!kitchen) {
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('id', kitchen.id.toString());

      const result = await deleteKitchen({}, formData);

      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
        onClose(); // Close the dialog on success
        onSuccess?.(); // Call additional success callback if provided
      } else {
        toast.error('Phản hồi không hợp lệ từ server.');
      }
    } catch (error) {
      console.error('🔄 [API] Delete operation failed', error);
      toast.error('Có lỗi xảy ra khi ngưng hoạt động bếp. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} modal={false}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Xác nhận ngưng hoạt động</DialogTitle>
          <DialogDescription className="pt-2">
            {kitchen ? (
              <>
                Bạn có chắc chắn muốn ngưng hoạt động bếp{' '}
                <span className="font-medium text-gray-900">
                  {kitchen.name}
                </span>{' '}
                (Mã: {kitchen.kitchenCode})?
                <br />
                <br />
                <span className="text-red-600 font-medium">
                  Hành động này sẽ đặt bếp về trạng thái không hoạt động và có thể được hoàn tác sau.
                </span>
              </>
            ) : (
              'Đang tải thông tin bếp...'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="mb-2 sm:mb-0"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !kitchen}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              'Xác nhận'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}