'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { ManyToManyAssignmentModal, type AssignmentItem } from '@/components/features/shared/many-to-many-assignment-modal';
import {
  getAllKitchens,
  getScopesForSupplier,
  updateSupplierServiceScopes,
} from '@/lib/actions/supplier.actions';
import type { Supplier } from '@/lib/hooks/use-suppliers';

interface SupplierServiceScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
}

export function SupplierServiceScopeModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}: SupplierServiceScopeModalProps) {
  const [kitchens, setKitchens] = useState<AssignmentItem[]>([]);
  const [selectedKitchenIds, setSelectedKitchenIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load kitchens and current service scopes when modal opens
  useEffect(() => {
    if (isOpen && supplier) {
      loadData();
    }
  }, [isOpen, supplier]);

  const loadData = async () => {
    if (!supplier) return;

    setIsLoading(true);
    try {
      // Fetch all kitchens and current scopes in parallel
      const [kitchensData, scopesData] = await Promise.all([
        getAllKitchens(),
        getScopesForSupplier(supplier.id),
      ]);

      // Transform kitchens data to match AssignmentItem interface
      const transformedKitchens: AssignmentItem[] = kitchensData.map((kitchen) => ({
        id: kitchen.id,
        name: kitchen.name,
        group: kitchen.region || 'Chưa phân loại',
      }));

      setKitchens(transformedKitchens);
      setSelectedKitchenIds(scopesData);
    } catch (error) {
      console.error('Error loading service scope data:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu phạm vi dịch vụ');
      setKitchens([]);
      setSelectedKitchenIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (selectedIds: number[]) => {
    if (!supplier) return;

    try {
      const result = await updateSupplierServiceScopes(supplier.id, selectedIds);

      if (result.success) {
        toast.success(result.success);
        onSuccess();
      } else if (result.error) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving service scopes:', error);
      toast.error('Có lỗi xảy ra khi lưu phạm vi dịch vụ');
      throw error;
    }
  };

  const handleClose = () => {
    setKitchens([]);
    setSelectedKitchenIds([]);
    onClose();
  };

  if (!supplier) return null;

  return (
    <ManyToManyAssignmentModal
      isOpen={isOpen}
      onClose={handleClose}
      onSave={handleSave}
      title="Quản lý Phạm vi Dịch vụ"
      description={`Chọn các bếp mà nhà cung cấp "${supplier.name}" có thể phục vụ`}
      items={kitchens}
      selectedIds={selectedKitchenIds}
      groupBy="group"
      searchPlaceholder="Tìm kiếm bếp..."
      emptyMessage="Không tìm thấy bếp nào"
      isLoading={isLoading}
    />
  );
}
