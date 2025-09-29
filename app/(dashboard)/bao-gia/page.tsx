import * as React from "react";
import { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { QuotationsDataTable } from "@/components/features/quotations/quotations-data-table";

export const metadata: Metadata = {
  title: "Quản lý Báo giá | QuoteMaster V3.2",
  description: "Quản lý báo giá từ nhà cung cấp - Mua tập trung, thực hiện phân tán",
};

export default function QuotationsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Báo giá</h1>
        <p className="text-muted-foreground">
          Quản lý và theo dõi báo giá từ các nhà cung cấp theo mô hình V3.2
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách Báo giá</CardTitle>
              <CardDescription>
                Tổng hợp báo giá từ nhà cung cấp theo kỳ và khu vực
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QuotationsDataTable />
        </CardContent>
      </Card>
    </div>
  );
}