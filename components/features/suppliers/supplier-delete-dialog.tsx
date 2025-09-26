'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { toggleSupplierStatus } from '@/lib/actions/supplier.actions';
import type { Supplier } from '@/lib/hooks/use-suppliers';

interface SupplierDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

export function SupplierDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!supplier) {
    return null;
  }

  const isActive = supplier.status === 'active';
  const newStatus = isActive ? 'inactive' : 'active';
  const actionText = isActive ? 'tạm dừng' : 'kích hoạt';
  const actionTitle = isActive ? 'Tạm dừng nhà cung cấp' : 'Kích hoạt nhà cung cấp';

  const handleConfirm = async () => {
    if (!supplier) return;

    setIsSubmitting(true);

    try {
      const result = await toggleSupplierStatus(supplier.id);

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error toggling supplier status:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <AlertDialogTitle>{actionTitle}</AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Bạn có chắc chắn muốn <strong>{actionText}</strong> nhà cung cấp này không?
              </p>

              {/* Supplier Information */}
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tên nhà cung cấp:</span>
                  <span className="text-sm">{supplier.name}</span>
                </div>

                {supplier.supplierCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mã nhà cung cấp:</span>
                    <span className="text-sm font-mono">{supplier.supplierCode}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trạng thái hiện tại:</span>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trạng thái sau khi {actionText}:</span>
                  <Badge variant={newStatus === 'active' ? 'default' : 'secondary'}>
                    {newStatus === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                  </Badge>
                </div>
              </div>

              {/* Action Consequences */}
              <div className="text-sm text-muted-foreground">
                {isActive ? (
                  <div className="space-y-1">
                    <p><strong>Lưu ý khi tạm dừng:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Nhà cung cấp sẽ không xuất hiện trong danh sách chọn khi tạo báo giá mới</li>
                      <li>Các báo giá hiện tại của nhà cung cấp vẫn được giữ nguyên</li>
                      <li>Bạn có thể kích hoạt lại bất cứ lúc nào</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p><strong>Khi kích hoạt:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Nhà cung cấp sẽ xuất hiện trở lại trong danh sách chọn</li>
                      <li>Có thể nhận báo giá mới từ nhà cung cấp này</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isActive ? 'Tạm dừng' : 'Kích hoạt'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}