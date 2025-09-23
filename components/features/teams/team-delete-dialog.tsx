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
import { deactivateTeam } from '@/lib/actions/team.actions';
import type { Team } from '@/lib/hooks/use-teams';

interface TeamDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  team: Team | null;
}

export function TeamDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  team,
}: TeamDeleteDialogProps) {
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Handle deactivate confirmation
  const handleDeactivate = async () => {
    if (!team) return;

    setIsDeactivating(true);

    try {
      const result = await deactivateTeam({ id: team.id });

      if (result.success) {
        toast.success(result.success);
        onSuccess();
        onClose();
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Deactivate team error:', error);
      toast.error('Có lỗi xảy ra khi tạm dừng nhóm. Vui lòng thử lại.');
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

  if (!team) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <AlertDialogTitle>Xác nhận tạm dừng nhóm</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Bạn có chắc chắn muốn tạm dừng hoạt động của nhóm này? Nhóm sẽ được đánh dấu là không hoạt động.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2">
            {team.teamCode && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Mã nhóm:</span>
                <span className="font-mono font-semibold">{team.teamCode}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Tên nhóm:</span>
              <span className="font-semibold">{team.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Loại hình:</span>
              <span>{team.teamType === 'KITCHEN' ? 'Nhóm Bếp' : 'Văn Phòng'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">Khu vực:</span>
              <span>{team.region}</span>
            </div>
            {team.managerName && (
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Quản lý:</span>
                <span>{team.managerName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-orange-500 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 mb-1">Lưu ý quan trọng:</p>
              <ul className="text-orange-700 space-y-1">
                <li>• Nhóm sẽ được đánh dấu là tạm dừng hoạt động</li>
                <li>• Dữ liệu lịch sử vẫn được bảo toàn trong hệ thống</li>
                <li>• Bạn có thể kích hoạt lại nhóm này bất cứ lúc nào</li>
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