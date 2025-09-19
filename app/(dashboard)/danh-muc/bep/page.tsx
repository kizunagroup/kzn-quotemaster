'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download } from 'lucide-react';
import { getKitchens } from '@/lib/actions/kitchen.actions';
import { KitchenDataTable, type KitchenDataTableRef } from '@/components/features/kitchens/kitchen-data-table';
import { KitchenFormModal } from '@/components/features/kitchens/kitchen-form-modal';
import { KitchenDeleteDialog } from '@/components/features/kitchens/kitchen-delete-dialog';

// Type definition for kitchen data
interface Kitchen {
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

export default function KitchenManagementPage() {
  // Data state
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataTableRef = useRef<KitchenDataTableRef>(null);

  // Modal state management
  const [activeModal, setActiveModal] = useState<'none' | 'form' | 'delete'>('none');
  const [modalData, setModalData] = useState<Kitchen | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Data fetching functions
  const fetchKitchens = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getKitchens();
      setKitchens(data);
      setError(null);
      console.log('🔄 [DATA] Data loaded successfully', { count: data.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách bếp';
      setError(errorMessage);
      console.error('🔄 [DATA] Data fetch failed', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshKitchens = useCallback(() => {
    fetchKitchens();
  }, [fetchKitchens]);

  // Modal controller functions
  const openForm = useCallback((mode: 'create' | 'edit', kitchen?: Kitchen) => {
    setModalMode(mode);
    setModalData(kitchen || null);
    setActiveModal('form');
  }, []);

  const openDelete = useCallback((kitchen: Kitchen) => {
    setModalData(kitchen);
    setActiveModal('delete');
  }, []);

  const closeModal = useCallback(() => {
    console.log('🚨 [CHECKPOINT] Modal Close Initiated', {
      currentModal: activeModal,
      timestamp: new Date().toISOString()
    });

    // UI Freeze Detection: Check if UI becomes unresponsive
    const uiTestStart = performance.now();
    console.log('🔍 [UI-TEST] Pre-State-Change UI Test Starting');

    React.startTransition(() => {
      setActiveModal('none');
      setModalData(null);

      // Immediate post-state UI test
      setTimeout(() => {
        const uiTestEnd = performance.now();
        console.log('🔍 [UI-TEST] Post-State-Change UI Test', {
          timeTaken: `${uiTestEnd - uiTestStart}ms`,
          status: 'responsive'
        });
      }, 0);
    });

    console.log('✅ [CHECKPOINT] Modal State Reset Complete');

    // Delayed UI responsiveness check
    setTimeout(() => {
      console.log('🔍 [UI-TEST] Delayed UI Responsiveness Check (100ms)', {
        timestamp: new Date().toISOString(),
        status: 'if-you-see-this-ui-is-still-responsive'
      });
    }, 100);
  }, [activeModal]);

  const handleSuccess = useCallback(() => {
    closeModal();
    refreshKitchens();
  }, [closeModal, refreshKitchens]);

  const handleEdit = useCallback((kitchen: Kitchen) => {
    console.log('🚨 [CHECKPOINT] Edit Flow Started', {
      action: 'edit_button_click',
      kitchenId: kitchen.id,
      kitchenName: kitchen.name,
      timestamp: new Date().toISOString()
    });
    openForm('edit', kitchen);
  }, [openForm]);

  const handleAddClick = useCallback(() => {
    openForm('create');
  }, [openForm]);

  const handlePageReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleUITest = useCallback(() => {
    console.log('🎯 [UI-TEST] Test Button Clicked - UI is RESPONSIVE', {
      timestamp: new Date().toISOString(),
      activeModal,
      status: 'UI-working-normally'
    });
    alert('UI Test: The UI is responsive!');
  }, [activeModal]);

  // Stable modal controller object
  const modalController = useMemo(() => ({
    openForm,
    openDelete,
    closeModal,
    handleSuccess,
    handleEdit
  }), [openForm, openDelete, closeModal, handleSuccess, handleEdit]);

  // UI Freeze Detection Hook
  useEffect(() => {
    if (activeModal === 'none') {
      // This runs when modal closes - test if UI is responsive
      const testTimeout = setTimeout(() => {
        console.log('🔍 [UI-TEST] useEffect Modal Close Detection', {
          activeModal,
          timestamp: new Date().toISOString(),
          message: 'UI-still-responsive-after-modal-close'
        });
      }, 50);

      return () => clearTimeout(testTimeout);
    }
  }, [activeModal]);

  // Initial data fetch
  useEffect(() => {
    fetchKitchens();
  }, [fetchKitchens]);

  if (loading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-4 sm:mb-0">
            Danh mục Bếp
          </h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-4 sm:mb-0">
            Danh mục Bếp
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lỗi truy cập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">{error}</p>
              <p className="text-sm text-gray-500">
                Vui lòng liên hệ quản trị viên hoặc thử lại sau.
              </p>
              <Button
                variant="outline"
                onClick={handlePageReload}
                className="mt-4"
              >
                Thử lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-4 sm:mb-0">
          Danh mục Bếp
        </h1>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={handleUITest}
          >
            🎯 Test UI
          </Button>

          <Button
            variant="default"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAddClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm
          </Button>

          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Bếp</CardTitle>
        </CardHeader>
        <CardContent>
          <KitchenDataTable
            ref={dataTableRef}
            data={kitchens}
            onEdit={modalController.handleEdit}
            onDelete={modalController.openDelete}
          />
        </CardContent>
      </Card>

      {/* Kitchen Form Modal */}
      <KitchenFormModal
        open={activeModal === 'form'}
        onClose={modalController.closeModal}
        initialData={modalMode === 'edit' ? modalData : null}
        onSuccess={modalController.handleSuccess}
      />

      {/* Kitchen Delete Dialog */}
      <KitchenDeleteDialog
        isOpen={activeModal === 'delete'}
        onClose={modalController.closeModal}
        kitchen={modalData}
        onSuccess={modalController.handleSuccess}
      />
    </section>
  );
}