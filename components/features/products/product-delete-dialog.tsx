'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, PowerOff, Power } from 'lucide-react';

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
import { toggleProductStatus } from '@/lib/actions/product.actions';
import type { Product } from '@/lib/hooks/use-products';

interface ProductDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

export function ProductDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductDeleteDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Configuration based on product status - ENHANCED like Staff pattern
  const isActive = product?.status === 'active';
  const actionConfig = {
    activate: {
      title: 'Xác nhận kích hoạt hàng hóa',
      description: 'Bạn có chắc chắn muốn kích hoạt hàng hóa này? Hàng hóa sẽ có thể được sử dụng trong báo giá.',
      icon: Power,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      actionButton: {
        text: 'Kích Hoạt',
        loadingText: 'Đang kích hoạt...',
        className: 'bg-green-600 text-white hover:bg-green-700'
      },
      warningColor: 'green',
      notes: [
        '• Hàng hóa sẽ xuất hiện trở lại trong danh sách chọn',
        '• Có thể được sử dụng trong báo giá mới',
        '• Tất cả dữ liệu lịch sử vẫn được bảo toàn'
      ]
    },
    deactivate: {
      title: 'Xác nhận tạm dừng hàng hóa',
      description: 'Bạn có chắc chắn muốn tạm dừng hàng hóa này? Hàng hóa sẽ được ẩn khỏi danh sách chọn.',
      icon: PowerOff,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      actionButton: {
        text: 'Tạm Dừng',
        loadingText: 'Đang tạm dừng...',
        className: 'bg-orange-600 text-white hover:bg-orange-700'
      },
      warningColor: 'orange',
      notes: [
        '• Hàng hóa sẽ không xuất hiện trong danh sách chọn khi tạo báo giá',
        '• Các báo giá hiện tại vẫn được giữ nguyên trong hệ thống',
        '• Bạn có thể kích hoạt lại hàng hóa bất cứ lúc nào'
      ]
    }
  };

  // Safe config retrieval with fallback to prevent crashes
  const currentConfig = isActive ? actionConfig.deactivate : actionConfig.activate;

  // Handle action confirmation - ROBUST like Staff pattern
  const handleConfirm = async () => {
    if (!product?.id) {
      toast.error('Không thể thực hiện thao tác: Thông tin hàng hóa không hợp lệ.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await toggleProductStatus(product.id);

      if (result?.success) {
        toast.success(result.success);
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      } else if (result?.error) {
        toast.error(result.error);
      } else {
        toast.error('Thao tác không thành công. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Có lỗi xảy ra khi thay đổi trạng thái hàng hóa. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle dialog close - ROBUST like Staff pattern
  const handleClose = () => {
    if (!isProcessing && typeof onClose === 'function') {
      onClose();
    }
  };

  if (!product) return null;

  const IconComponent = currentConfig.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${currentConfig.iconBg}`}>
              <IconComponent className={`h-5 w-5 ${currentConfig.iconColor}`} />
            </div>
            <div>
              <AlertDialogTitle>{currentConfig.title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {currentConfig.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Product Information */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Mã hàng:</span>
              <span className="font-mono font-semibold">{product.productCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Tên hàng:</span>
              <span className="font-semibold">{product.name || 'N/A'}</span>
            </div>
            {product.unit && product.unit.trim() !== '' && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Đơn vị tính:</span>
                <span>{product.unit}</span>
              </div>
            )}
            {product.category && product.category.trim() !== '' && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Nhóm hàng:</span>
                <span>{product.category}</span>
              </div>
            )}
            {product.basePrice && product.basePrice.trim() !== '' && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Giá cơ sở:</span>
                <span>{Number(product.basePrice).toLocaleString('vi-VN')} VND</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Notice */}
        <div className={`rounded-lg border-l-4 border-l-${currentConfig.warningColor}-500 bg-${currentConfig.warningColor}-50 p-4`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 text-${currentConfig.warningColor}-600 mt-0.5 flex-shrink-0`} />
            <div className="text-sm">
              <p className={`font-medium text-${currentConfig.warningColor}-800 mb-1`}>Lưu ý quan trọng:</p>
              <ul className={`text-${currentConfig.warningColor}-700 space-y-1`}>
                {currentConfig.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isProcessing}
            className={currentConfig.actionButton.className}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {currentConfig.actionButton.loadingText}
              </>
            ) : (
              currentConfig.actionButton.text
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}