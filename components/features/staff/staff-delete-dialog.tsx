'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, UserX, UserMinus } from 'lucide-react';

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
import {
  deactivateStaff,
  updateStaff,
  type UpdateStaffInput
} from '@/lib/actions/staff.actions';
import type { Staff } from '@/lib/hooks/use-staff';

interface StaffDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: Staff | null;
  actionType: 'deactivate' | 'terminate';
}

export function StaffDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  staff,
  actionType,
}: StaffDeleteDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Configuration based on action type
  const config = {
    deactivate: {
      title: 'Xác nhận tạm dừng nhân viên',
      description: 'Bạn có chắc chắn muốn tạm dừng hoạt động của nhân viên này? Nhân viên sẽ được đánh dấu là tạm dừng.',
      icon: UserMinus,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      actionButton: {
        text: 'Tạm Dừng',
        loadingText: 'Đang tạm dừng...',
        className: 'bg-orange-600 text-white hover:bg-orange-700'
      },
      warningColor: 'orange',
      notes: [
        '• Nhân viên sẽ được đánh dấu là tạm dừng hoạt động',
        '• Dữ liệu lịch sử vẫn được bảo toàn trong hệ thống',
        '• Bạn có thể kích hoạt lại nhân viên này bất cứ lúc nào'
      ]
    },
    terminate: {
      title: 'Xác nhận chấm dứt hợp đồng',
      description: 'Bạn có chắc chắn muốn chấm dứt hợp đồng của nhân viên này? Đây là hành động nghiêm trọng.',
      icon: UserX,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      actionButton: {
        text: 'Chấm Dứt',
        loadingText: 'Đang chấm dứt...',
        className: 'bg-red-600 text-white hover:bg-red-700'
      },
      warningColor: 'red',
      notes: [
        '• Nhân viên sẽ được đánh dấu là đã nghỉ việc',
        '• Thao tác này có thể ảnh hưởng đến báo cáo và lịch sử',
        '• Vui lòng cân nhắc kỹ trước khi thực hiện'
      ]
    }
  };

  const currentConfig = config[actionType];

  // Handle action confirmation
  const handleAction = async () => {
    if (!staff) return;

    setIsProcessing(true);

    try {
      let result;

      if (actionType === 'deactivate') {
        // Use the existing deactivateStaff function
        result = await deactivateStaff({ id: staff.id });
      } else {
        // Use updateStaff to set status to terminated
        const updateData: UpdateStaffInput = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phone: staff.phone || '',
          jobTitle: staff.jobTitle || '',
          department: staff.department || '',
          employeeCode: staff.employeeCode || '',
          hireDate: staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : '',
          status: 'terminated'
        };
        result = await updateStaff(updateData);
      }

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error(`${actionType} staff error:`, error);
      toast.error(`Có lỗi xảy ra khi ${actionType === 'deactivate' ? 'tạm dừng' : 'chấm dứt hợp đồng'} nhân viên. Vui lòng thử lại.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  if (!staff) return null;

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

        {/* Staff Information */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2">
            {staff.employeeCode && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Mã nhân viên:</span>
                <span className="font-mono font-semibold">{staff.employeeCode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Tên nhân viên:</span>
              <span className="font-semibold">{staff.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Email:</span>
              <span>{staff.email}</span>
            </div>
            {staff.department && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Phòng ban:</span>
                <span>{staff.department}</span>
              </div>
            )}
            {staff.jobTitle && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Chức danh:</span>
                <span>{staff.jobTitle}</span>
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
            onClick={handleAction}
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