import { Suspense } from "react";
import { Metadata } from "next/metadata";
import { SuppliersDataTable } from "@/components/features/suppliers/suppliers-data-table";

export const metadata: Metadata = {
  title: "Quản lý Nhà cung cấp | QuoteMaster",
  description: "Quản lý danh sách nhà cung cấp trong hệ thống QuoteMaster",
};

export default function SuppliersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Quản lý Nhà cung cấp
        </h2>
      </div>

      <Suspense fallback={<div>Đang tải...</div>}>
        <SuppliersDataTable />
      </Suspense>
    </div>
  );
}
