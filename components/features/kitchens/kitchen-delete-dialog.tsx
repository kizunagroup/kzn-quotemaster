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
  console.log('🗑️ [DELETE DIALOG] Component rendered');
  console.log('🗑️ [DELETE DIALOG] Props:', { isOpen, kitchen: kitchen?.id, onClose: !!onClose, onSuccess: !!onSuccess });

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    console.log('🗑️ [DELETE DIALOG] handleConfirm called');
    console.log('🗑️ [DELETE DIALOG] Kitchen to delete:', kitchen);

    if (!kitchen) {
      console.warn('🗑️ [DELETE DIALOG] No kitchen provided, aborting');
      return;
    }

    console.log('🗑️ [DELETE DIALOG] Setting loading state to true');
    setIsLoading(true);

    try {
      console.log('🗑️ [DELETE DIALOG] Creating FormData...');
      const formData = new FormData();
      formData.append('id', kitchen.id.toString());

      console.log('🗑️ [DELETE DIALOG] FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`🗑️ [DELETE DIALOG] FormData: ${key} = ${value}`);
      }

      console.log('🗑️ [DELETE DIALOG] Calling deleteKitchen server action...');
      console.log('🗑️ [DELETE DIALOG] Kitchen ID being passed:', kitchen.id);

      let result;
      try {
        result = await deleteKitchen({}, formData);
        console.log('🗑️ [DELETE DIALOG] deleteKitchen result:', result);
      } catch (deleteError) {
        console.error('❌ [DELETE DIALOG] Error calling deleteKitchen:', deleteError);
        console.error('❌ [DELETE DIALOG] Delete error stack:', deleteError instanceof Error ? deleteError.stack : 'No stack trace');
        throw deleteError;
      }

      console.log('🗑️ [DELETE DIALOG] Processing server action result...');

      if (result.error) {
        console.log('❌ [DELETE DIALOG] Server returned error:', result.error);
        // Show destructive error toast and keep dialog open
        toast({
          variant: "destructive",
          title: "Lỗi ngưng hoạt động bếp",
          description: result.error,
        });
        // DO NOT close dialog on error - user needs to see the error and can try again later
        console.log('🗑️ [DELETE DIALOG] Keeping dialog open due to error');
      } else if (result.success) {
        console.log('✅ [DELETE DIALOG] Server returned success:', result.success);
        toast({
          variant: "default",
          title: "Thành công",
          description: result.success,
        });
        console.log('🗑️ [DELETE DIALOG] Closing dialog and calling onSuccess...');
        onClose();
        onSuccess?.();
      } else {
        console.warn('⚠️ [DELETE DIALOG] Unexpected result format:', result);
        toast({
          variant: "destructive",
          title: "Lỗi không xác định",
          description: 'Phản hồi không hợp lệ từ server.',
        });
        // Keep dialog open for unexpected results too
        console.log('🗑️ [DELETE DIALOG] Keeping dialog open due to unexpected result');
      }
    } catch (error) {
      console.error('❌ [DELETE DIALOG] Error in handleConfirm:', error);
      console.error('❌ [DELETE DIALOG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast({
        variant: "destructive",
        title: "Lỗi hệ thống",
        description: 'Có lỗi xảy ra khi ngưng hoạt động bếp. Vui lòng thử lại.',
      });
      // Keep dialog open on client-side errors too
      console.log('🗑️ [DELETE DIALOG] Keeping dialog open due to client error');
    } finally {
      console.log('🗑️ [DELETE DIALOG] Setting loading state to false');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('🗑️ [DELETE DIALOG] handleCancel called');
    console.log('🗑️ [DELETE DIALOG] isLoading:', isLoading);

    if (!isLoading) {
      console.log('🗑️ [DELETE DIALOG] Closing dialog (not loading)');
      onClose();
    } else {
      console.log('🗑️ [DELETE DIALOG] Cannot close dialog while loading');
    }
  };

  const handleOpenChange = (open: boolean) => {
    console.log('🗑️ [DELETE DIALOG] handleOpenChange called with:', open);
    if (!open && !isLoading) {
      console.log('🗑️ [DELETE DIALOG] Dialog closing via handleOpenChange');
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