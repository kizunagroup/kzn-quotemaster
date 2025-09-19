"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
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
  console.log('📱 [COMPONENT] KitchenDeleteDialog rendered', { isOpen, kitchenId: kitchen?.id, hasOnClose: !!onClose, hasOnSuccess: !!onSuccess });

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    console.log('📱 [COMPONENT] User action', { action: 'confirm_delete', kitchenId: kitchen?.id });

    if (!kitchen) {
      console.warn('📱 [COMPONENT] No kitchen provided, aborting delete');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('id', kitchen.id.toString());

      console.log('📱 [COMPONENT] Calling deleteKitchen server action', { kitchenId: kitchen.id });

      const result = await deleteKitchen({}, formData);
      console.log('📱 [COMPONENT] Delete server action result', { success: result.success, error: result.error });

      if (result.error) {
        console.log('📱 [COMPONENT] Delete operation failed', { error: result.error });
        toast({
          variant: "destructive",
          title: "Lỗi ngưng hoạt động bếp",
          description: result.error,
        });
        // Keep dialog open on error - user can try again
      } else if (result.success) {
        console.log('📱 [COMPONENT] Delete operation succeeded', { success: result.success });
        toast({
          variant: "default",
          title: "Thành công",
          description: result.success,
        });
        onSuccess?.(); // Call parent success handler instead of managing dialog state
      } else {
        console.warn('📱 [COMPONENT] Unexpected server response format', { result });
        toast({
          variant: "destructive",
          title: "Lỗi không xác định",
          description: 'Phản hồi không hợp lệ từ server.',
        });
      }
    } catch (error) {
      console.error('📱 [COMPONENT] Error in delete operation:', error);
      toast({
        variant: "destructive",
        title: "Lỗi hệ thống",
        description: 'Có lỗi xảy ra khi ngưng hoạt động bếp. Vui lòng thử lại.',
      });
      // Keep dialog open on client-side errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('📱 [COMPONENT] User action', { action: 'cancel_delete' });
    if (!isLoading) {
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    console.log('📱 [COMPONENT] Dialog open change', { open, isLoading });
    if (!open && !isLoading) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận ngưng hoạt động</AlertDialogTitle>
          <AlertDialogDescription>
            {kitchen ? (
              <>
                Bạn có chắc chắn muốn ngưng hoạt động bếp{' '}
                <span className="font-medium text-gray-900">
                  {kitchen.name}
                </span>{' '}
                (Mã: {kitchen.kitchenCode})?
                <br />
                <br />
                <span className="text-red-600">
                  Hành động này sẽ đặt bếp về trạng thái không hoạt động và có thể được hoàn tác sau.
                </span>
              </>
            ) : (
              'Đang tải thông tin bếp...'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
          >
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
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
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}