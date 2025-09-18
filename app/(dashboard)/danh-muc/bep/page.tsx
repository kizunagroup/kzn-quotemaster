import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download } from 'lucide-react';
import { getKitchens } from '@/lib/actions/kitchen.actions';

export default async function KitchenManagementPage() {
  try {
    // Fetch initial kitchen data using server action
    const kitchens = await getKitchens();

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
            {/* Temporary placeholder for KitchenDataTable component */}
            <div className="border rounded-lg p-8 text-center bg-gray-50">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Kitchen Data Table Placeholder
                </h3>
                <p className="text-sm text-gray-500">
                  KitchenDataTable component will be rendered here
                </p>
                <div className="text-xs text-gray-400">
                  <p>Found {kitchens.length} kitchens in database</p>
                  {kitchens.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {kitchens.slice(0, 3).map((kitchen) => (
                        <p key={kitchen.id}>
                          • {kitchen.name} ({kitchen.kitchenCode}) - {kitchen.region}
                        </p>
                      ))}
                      {kitchens.length > 3 && (
                        <p>... and {kitchens.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  } catch (error) {
    // Error handling for unauthorized access or other errors
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
              <p className="text-red-500 mb-2">
                {error instanceof Error ? error.message : 'Không thể tải danh sách bếp'}
              </p>
              <p className="text-sm text-gray-500">
                Vui lòng liên hệ quản trị viên hoặc thử lại sau.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }
}