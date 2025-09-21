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
import { deleteKitchen } from '@/lib/actions/kitchen.actions';
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
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!kitchen) return;

    setIsDeleting(true);

    try {
      const result = await deleteKitchen({ id: kitchen.id });

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Delete kitchen error:', error);
      toast.error('Có lỗi xảy ra khi ngưng hoạt động bếp. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isDeleting) {
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
              <AlertDialogTitle>Xác nhận ngưng hoạt động bếp</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Bạn có chắc chắn muốn ngưng hoạt động bếp này? Bếp sẽ được đánh dấu là không hoạt động.
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
                <li>• Bếp sẽ được đánh dấu là ngưng hoạt động và không còn hiển thị trong danh sách</li>
                <li>• Dữ liệu lịch sử vẫn được bảo toàn trong hệ thống</li>
                <li>• Bạn có thể khôi phục hoạt động bếp này sau nếu cần thiết</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang ngưng hoạt động...
              </>
            ) : (
              'Ngưng hoạt động'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}