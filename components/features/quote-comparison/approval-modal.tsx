"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { approveMultipleQuotations } from "@/lib/actions/quote-comparison.actions";
import type { ComparisonMatrixData } from "@/lib/types/quote-comparison.types";

export interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: ComparisonMatrixData['availableSuppliers'];
  onApprovalComplete: () => void;
}

export function ApprovalModal({
  open,
  onOpenChange,
  suppliers,
  onApprovalComplete,
}: ApprovalModalProps) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter suppliers that have quotations to approve (quotationId exists and not null)
  const approvableSuppliers = suppliers.filter(
    supplier => supplier.quotationId && supplier.quotationId > 0
  );

  const handleSupplierToggle = (supplierId: number, checked: boolean) => {
    const newSelected = new Set(selectedSuppliers);
    if (checked) {
      newSelected.add(supplierId);
    } else {
      newSelected.delete(supplierId);
    }
    setSelectedSuppliers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.size === approvableSuppliers.length) {
      // Unselect all
      setSelectedSuppliers(new Set());
    } else {
      // Select all
      setSelectedSuppliers(new Set(approvableSuppliers.map(s => s.id)));
    }
  };

  const handleApprove = async () => {
    if (selectedSuppliers.size === 0) {
      setError("Vui lòng chọn ít nhất một nhà cung cấp để phê duyệt");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get quotation IDs for selected suppliers
      const quotationIds = approvableSuppliers
        .filter(supplier => selectedSuppliers.has(supplier.id))
        .map(supplier => supplier.quotationId!)
        .filter(id => id > 0);

      if (quotationIds.length === 0) {
        throw new Error("Không tìm thấy báo giá hợp lệ để phê duyệt");
      }

      await approveMultipleQuotations({ quotationIds });

      // Show success toast
      toast.success(`Đã phê duyệt thành công ${quotationIds.length} báo giá từ ${selectedSuppliers.size} nhà cung cấp!`);

      // Success - close modal and refresh parent data
      onApprovalComplete();
      setSelectedSuppliers(new Set()); // Reset selections
    } catch (err) {
      console.error('Error approving quotations:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Lỗi khi phê duyệt báo giá";

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedSuppliers(new Set());
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Phê duyệt báo giá
          </DialogTitle>
          <DialogDescription>
            Chọn các nhà cung cấp để phê duyệt báo giá của họ. Các sản phẩm sẽ được phê duyệt với giá hiện tại (đã đàm phán hoặc giá ban đầu).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {approvableSuppliers.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>Không có nhà cung cấp nào có báo giá để phê duyệt</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Toggle */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={
                    approvableSuppliers.length > 0 &&
                    selectedSuppliers.size === approvableSuppliers.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Chọn tất cả ({approvableSuppliers.length} nhà cung cấp)
                </label>
              </div>

              {/* Supplier List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {approvableSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={`supplier-${supplier.id}`}
                      checked={selectedSuppliers.has(supplier.id)}
                      onCheckedChange={(checked) =>
                        handleSupplierToggle(supplier.id, checked === true)
                      }
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`supplier-${supplier.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {supplier.code} - {supplier.name}
                      </label>
                      <div className="text-xs text-muted-foreground">
                        Trạng thái: {supplier.quotationStatus || 'Không xác định'}
                        {supplier.quotationLastUpdated && (
                          <span className="ml-2">
                            • Cập nhật: {new Date(supplier.quotationLastUpdated).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Summary */}
              <div className="text-sm text-muted-foreground pt-2 border-t">
                Đã chọn: {selectedSuppliers.size} / {approvableSuppliers.length} nhà cung cấp
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || selectedSuppliers.size === 0 || approvableSuppliers.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang phê duyệt...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Duyệt các NCC đã chọn ({selectedSuppliers.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}