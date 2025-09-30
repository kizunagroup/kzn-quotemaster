"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComparisonMatrixData } from "@/lib/types/quote-comparison.types";

export interface ComparisonMatrixProps {
  matrixData: ComparisonMatrixData;
  className?: string;
}

export function ComparisonMatrix({ matrixData, className }: ComparisonMatrixProps) {
  // Early return if no data
  if (!matrixData || matrixData.products.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Chi tiết So sánh Báo giá</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p>Không có dữ liệu sản phẩm để hiển thị.</p>
            <p className="text-sm mt-2">
              Vui lòng kiểm tra lại các tiêu chí lọc hoặc đảm bảo có báo giá trong kỳ này.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { period, region, category } = matrixData;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Chi tiết So sánh Báo giá</CardTitle>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Kỳ: {period}</Badge>
          <Badge variant="outline">Khu vực: {region}</Badge>
          {category && <Badge variant="outline">Nhóm hàng: {category}</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-center text-gray-500 py-8">
          <p>Component is being rebuilt - simplified version</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComparisonMatrix;