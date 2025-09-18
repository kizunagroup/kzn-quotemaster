'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download } from 'lucide-react';
import { getKitchens } from '@/lib/actions/kitchen.actions';
import { KitchenDataTable, type KitchenDataTableRef } from '@/components/features/kitchens/kitchen-data-table';

export default function KitchenManagementPage() {
  const [kitchens, setKitchens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataTableRef = useRef<KitchenDataTableRef>(null);

  // Fetch initial kitchen data
  useEffect(() => {
    const fetchKitchens = async () => {
      try {
        setLoading(true);
        const data = await getKitchens();
        setKitchens(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách bếp');
      } finally {
        setLoading(false);
      }
    };

    fetchKitchens();
  }, []);

  const handleAddClick = () => {
    dataTableRef.current?.openAddModal();
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
          <KitchenDataTable ref={dataTableRef} data={kitchens} />
        </CardContent>
      </Card>
    </section>
  );
}