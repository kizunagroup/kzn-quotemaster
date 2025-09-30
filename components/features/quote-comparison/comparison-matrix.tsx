"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriceBadge } from "@/components/ui/price-badge";
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
          <CardTitle>Ma trận So sánh Báo giá</CardTitle>
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

  // Extract unique suppliers from the matrix data
  const suppliers = matrixData.suppliers.sort((a, b) => a.code.localeCompare(b.code));

  // Get matrix info for header
  const { period, region, category } = matrixData;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Ma trận So sánh Báo giá</CardTitle>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">Kỳ: {period}</Badge>
          <Badge variant="outline">Khu vực: {region}</Badge>
          {category && <Badge variant="outline">Nhóm hàng: {category}</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Fixed product information columns */}
                <TableHead className="min-w-[100px]">Mã SP</TableHead>
                <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>
                <TableHead className="min-w-[80px] text-right">Số lượng</TableHead>
                <TableHead className="min-w-[60px]">Đơn vị</TableHead>

                {/* Dynamic supplier columns */}
                {suppliers.map((supplier) => (
                  <TableHead
                    key={supplier.id}
                    className="min-w-[150px] text-center"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{supplier.code}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {supplier.name}
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {matrixData.products.map((product) => (
                <TableRow key={product.productId}>
                  {/* Product information cells */}
                  <TableCell className="font-medium">
                    {product.productCode}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {product.productId}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-medium">{product.quantity.toLocaleString('vi-VN')}</div>
                      {product.quantitySource === 'kitchen_demand' ? (
                        <Badge variant="secondary" className="text-xs">
                          Nhu cầu bếp
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Số lượng cơ bản
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {product.unit}
                  </TableCell>

                  {/* Dynamic supplier price cells */}
                  {suppliers.map((supplier) => {
                    const supplierData = product.suppliers[supplier.id];

                    return (
                      <TableCell key={supplier.id} className="text-center">
                        {supplierData ? (
                          <div className="space-y-2">
                            <PriceBadge
                              price={supplierData.pricePerUnit}
                              isBestPrice={product.bestSupplierId === supplier.id}
                              size="sm"
                              currency={supplierData.currency}
                            />

                            {/* Additional price information */}
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                Tổng: {supplierData.totalPrice.toLocaleString('vi-VN')} ₫
                              </div>
                              {supplierData.vatRate > 0 && (
                                <div>
                                  VAT {supplierData.vatRate}%: {' '}
                                  {supplierData.vatAmount.toLocaleString('vi-VN')} ₫
                                </div>
                              )}
                              <div className="font-medium">
                                Cuối cùng: {supplierData.totalPriceWithVAT.toLocaleString('vi-VN')} ₫
                              </div>
                            </div>

                            {/* Price type indicator */}
                            {supplierData.approvedPrice && (
                              <Badge variant="default" className="text-xs">
                                Đã duyệt
                              </Badge>
                            )}
                            {!supplierData.approvedPrice && supplierData.negotiatedPrice && (
                              <Badge variant="secondary" className="text-xs">
                                Đàm phán
                              </Badge>
                            )}
                            {!supplierData.approvedPrice && !supplierData.negotiatedPrice && supplierData.initialPrice && (
                              <Badge variant="outline" className="text-xs">
                                Ban đầu
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">
                            <div className="text-sm">Chưa báo giá</div>
                            <div className="text-xs">N/A</div>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Matrix summary information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="font-medium">Thông tin tổng quan</div>
            <div>Tổng sản phẩm: {matrixData.products.length}</div>
            <div>Tổng nhà cung cấp: {suppliers.length}</div>
          </div>

          <div className="space-y-1">
            <div className="font-medium">Phạm vi so sánh</div>
            <div>Kỳ: {period}</div>
            <div>Khu vực: {region}</div>
            {category && <div>Nhóm hàng: {category}</div>}
          </div>

          <div className="space-y-1">
            <div className="font-medium">Cập nhật cuối</div>
            <div>{matrixData.lastUpdated.toLocaleString('vi-VN')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComparisonMatrix;