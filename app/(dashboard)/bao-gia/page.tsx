import { Suspense } from "react";
import { Metadata } from "next";
import { QuotationsDataTable } from "@/components/features/quotations/quotations-data-table";

export const metadata: Metadata = {
  title: "Quản lý Báo giá | Kizuna",
  description: "Quản lý báo giá từ nhà cung cấp trong hệ thống QuoteMaster",
};

export default function QuotationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Báo giá</h2>
      </div>

      <Suspense fallback={<div>Đang tải...</div>}>
        <QuotationsDataTable />
      </Suspense>
    </div>
  );
}