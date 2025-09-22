'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';

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
import { deactivateKitchen } from '@/lib/actions/kitchen.actions';
import type { Kitchen } from '@/lib/hooks/use-kitchens';

interface KitchenDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kitchen: Kitchen | null;
}

export function KitchenDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  kitchen,
}: KitchenDeleteDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Handle deactivate confirmation
  const handleDeactivate = async () => {
    if (!kitchen) return;

    setIsDeactivating(true);

    try {
      const result = await deactivateKitchen({ id: kitchen.id });

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Deactivate kitchen error:', error);
      toast.error('Có lỗi xảy ra khi tạm dừng bếp. Vui lòng thử lại.');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isDeactivating) {
      onClose();
    }
  };

  if (!kitchen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Xác nhận tạm dừng bếp</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Bạn có chắc chắn muốn tạm dừng hoạt động của bếp này? Bếp sẽ được đánh dấu là không hoạt động.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Mã bếp:</span>
              <span className="font-mono font-semibold">{kitchen.kitchenCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Tên bếp:</span>
              <span className="font-semibold">{kitchen.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Khu vực:</span>
              <span>{kitchen.region}</span>
            </div>
            {kitchen.managerName && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Quản lý:</span>
                <span>{kitchen.managerName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-destructive bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Lưu ý quan trọng:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Bếp sẽ được đánh dấu là tạm dừng hoạt động</li>
                <li>• Dữ liệu lịch sử vẫn được bảo toàn trong hệ thống</li>
                <li>• Bạn có thể kích hoạt lại bếp này bất cứ lúc nào</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={isDeactivating}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {isDeactivating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạm dừng...
              </>
            ) : (
              'Tạm Dừng'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}