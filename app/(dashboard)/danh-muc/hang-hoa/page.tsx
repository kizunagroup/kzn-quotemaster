import { Suspense } from "react";
import { Metadata } from "next";
import { ProductsDataTable } from "@/components/features/products/products-data-table";

export const metadata: Metadata = {
  title: "Quản lý Hàng hóa | QuoteMaster",
  description: "Quản lý danh sách hàng hóa trong hệ thống QuoteMaster",
};

export default function ProductsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Hàng hóa</h2>
      </div>

      <Suspense fallback={<div>Đang tải...</div>}>
        <ProductsDataTable />
      </Suspense>
    </div>
  );
}
