'use client';

import { useState, useRef, useEffect } from 'react';
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

  // Unified modal state management
  const [activeModal, setActiveModal] = useState<'none' | 'form' | 'delete'>('none');
  const [modalData, setModalData] = useState<Kitchen | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Unified Modal Controller
  const modalController = {
    openForm: (mode: 'create' | 'edit', kitchen?: Kitchen) => {
      console.log('🎯 [MODAL] Opening form modal', { mode, kitchenId: kitchen?.id });
      setModalMode(mode);
      setModalData(kitchen || null);
      setActiveModal('form');
    },

    openDelete: (kitchen: Kitchen) => {
      console.log('🎯 [MODAL] Opening delete modal', { kitchenId: kitchen.id });
      setModalData(kitchen);
      setActiveModal('delete');
    },

    closeModal: () => {
      console.log('🎯 [MODAL] Closing active modal', { current: activeModal });
      setActiveModal('none');
      setModalData(null);
      // Cleanup happens here, not in child components
    },

    handleSuccess: () => {
      console.log('🎯 [MODAL] Modal action succeeded, refreshing data');
      modalController.closeModal();
      refreshKitchens(); // Single data refresh point
    }
  };

  // Data fetching functions
  const fetchKitchens = async () => {
    try {
      console.log('🔄 [DATA] Fetching kitchens data');
      setLoading(true);
      const data = await getKitchens();
      setKitchens(data);
      setError(null);
      console.log('🔄 [DATA] Kitchens data loaded successfully', { count: data.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải danh sách bếp';
      console.error('🔄 [DATA] Error fetching kitchens:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshKitchens = () => {
    console.log('🔄 [DATA] Refresh triggered', { reason: 'modal_success' });
    fetchKitchens();
  };

  // Fetch initial kitchen data
  useEffect(() => {
    fetchKitchens();
  }, []);

  const handleAddClick = () => {
    modalController.openForm('create');
  };

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
                onClick={() => window.location.reload()}
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
          {/* Kitchen Data Table */}
          <KitchenDataTable
            ref={dataTableRef}
            data={kitchens}
            onEdit={(kitchen) => modalController.openForm('edit', kitchen)}
            onDelete={(kitchen) => modalController.openDelete(kitchen)}
          />
        </CardContent>
      </Card>

      {/* Kitchen Form Modal */}
      <KitchenFormModal
        open={activeModal === 'form'}
        onOpenChange={(open) => {
          if (!open) {
            modalController.closeModal();
          }
        }}
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