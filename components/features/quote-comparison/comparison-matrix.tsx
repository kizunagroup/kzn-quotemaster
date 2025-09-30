"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceBadge } from "@/components/ui/price-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { negotiateQuotation, approveQuotation } from "@/lib/actions/quote-comparison.actions";
import type { ComparisonMatrixData } from "@/lib/types/quote-comparison.types";

export interface ComparisonMatrixProps {
  matrixData: ComparisonMatrixData;
  className?: string;
}

export function ComparisonMatrix({ matrixData, className }: ComparisonMatrixProps) {
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

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
  const suppliers = matrixData.suppliers.sort((a, b) => a.code.localeCompare(b.code));

  // Action handlers
  const handleNegotiate = async (quotationId: number, supplierName: string) => {
    const actionKey = `negotiate_${quotationId}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      await negotiateQuotation({ id: quotationId });
      // TODO: Show success message and refresh data
    } catch (error) {
      console.error('Error negotiating quotation:', error);
      // TODO: Show error message
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleApprove = async (quotationId: number, supplierName: string) => {
    const actionKey = `approve_${quotationId}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
    try {
      await approveQuotation({ id: quotationId });
      // TODO: Show success message and refresh data
    } catch (error) {
      console.error('Error approving quotation:', error);
      // TODO: Show error message
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Helper function to calculate price variance
  const calculateVariance = (currentPrice: number, previousPrice?: number) => {
    if (!previousPrice || previousPrice === 0) return null;
    const difference = currentPrice - previousPrice;
    const percentage = (difference / previousPrice) * 100;
    return { difference, percentage };
  };

  // Helper function to format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <TooltipProvider>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Fixed product information columns */}
                  <TableHead className="min-w-[100px]">Mã SP</TableHead>
                  <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>
                  <TableHead className="min-w-[120px] text-center">Giá cơ sở</TableHead>
                  <TableHead className="min-w-[120px] text-center">Giá duyệt kỳ trước</TableHead>

                  {/* Dynamic supplier columns */}
                  {suppliers.map((supplier) => (
                    <TableHead
                      key={supplier.id}
                      className="min-w-[180px] text-center"
                    >
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="font-medium">{supplier.code}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {supplier.name}
                          </div>
                        </div>

                        {/* Action Buttons for each supplier */}
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => handleNegotiate(supplier.id, supplier.name)}
                            disabled={loadingActions[`negotiate_${supplier.id}`]}
                          >
                            {loadingActions[`negotiate_${supplier.id}`] ? 'Đang xử lý...' : 'Đàm phán'}
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => handleApprove(supplier.id, supplier.name)}
                            disabled={loadingActions[`approve_${supplier.id}`]}
                          >
                            {loadingActions[`approve_${supplier.id}`] ? 'Đang xử lý...' : 'Duyệt giá'}
                          </Button>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {matrixData.products.map((product) => {
                  // Calculate base price (lowest initial price or first available)
                  const supplierPrices = Object.values(product.suppliers).filter(s => s.initialPrice);
                  const basePrice = supplierPrices.length > 0
                    ? Math.min(...supplierPrices.map(s => s.initialPrice || Infinity))
                    : undefined;

                  return (
                    <TableRow key={product.productId}>
                      {/* Product Code */}
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{product.productCode}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.unit}
                          </div>
                        </div>
                      </TableCell>

                      {/* Product Name */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            SL: {product.quantity.toLocaleString('vi-VN')} {product.unit}
                          </div>
                        </div>
                      </TableCell>

                      {/* Base Price */}
                      <TableCell className="text-center">
                        {basePrice ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-600">
                              {formatPrice(basePrice)}
                            </div>
                            <div className="text-xs text-muted-foreground">/ {product.unit}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">N/A</div>
                        )}
                      </TableCell>

                      {/* Previous Approved Price */}
                      <TableCell className="text-center">
                        {product.previousApprovedPrice ? (
                          <div className="space-y-1">
                            <div className="font-medium text-blue-600">
                              {formatPrice(product.previousApprovedPrice)}
                            </div>
                            <div className="text-xs text-muted-foreground">/ {product.unit}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Chưa có</div>
                        )}
                      </TableCell>

                      {/* Dynamic supplier price cells */}
                      {suppliers.map((supplier) => {
                        const supplierData = product.suppliers[supplier.id];

                        if (!supplierData) {
                          return (
                            <TableCell key={supplier.id} className="text-center">
                              <div className="text-gray-400 text-sm py-4">Chưa báo giá</div>
                            </TableCell>
                          );
                        }

                        const currentPrice = supplierData.pricePerUnit;
                        const variance = calculateVariance(currentPrice, product.previousApprovedPrice);
                        const isBestPrice = product.bestSupplierId === supplier.id;

                        return (
                          <TableCell key={supplier.id} className="text-center">
                            <div className="space-y-3">
                              {/* Current Price Display with PriceBadge */}
                              <div className="space-y-1">
                                <PriceBadge
                                  price={currentPrice}
                                  isBestPrice={isBestPrice}
                                  size="sm"
                                  currency={supplierData.currency}
                                />
                                <div className="text-xs text-muted-foreground">/ {product.unit}</div>

                                {/* Best Price Badge */}
                                {isBestPrice && (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    Giá tốt nhất
                                  </Badge>
                                )}
                              </div>

                              {/* Variance Display */}
                              {variance && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className={cn(
                                      "flex items-center justify-center gap-1 text-sm",
                                      variance.percentage > 0 ? "text-red-600" : "text-green-600"
                                    )}>
                                      {variance.percentage > 0 ? (
                                        <TrendingUpIcon className="h-3 w-3" />
                                      ) : (
                                        <TrendingDownIcon className="h-3 w-3" />
                                      )}
                                      <span>
                                        {variance.percentage > 0 ? '+' : ''}
                                        {variance.percentage.toFixed(1)}%
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <div>So với kỳ trước:</div>
                                      <div>
                                        {variance.difference > 0 ? '+' : ''}
                                        {formatPrice(variance.difference)}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {/* Price Status Badge */}
                              <div>
                                {supplierData.approvedPrice ? (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    Đã duyệt
                                  </Badge>
                                ) : supplierData.negotiatedPrice ? (
                                  <Badge variant="secondary" className="text-xs">
                                    Đàm phán
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Báo giá ban đầu
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Matrix summary information */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-gray-700">Thống kê</div>
                <div>Sản phẩm: {matrixData.products.length}</div>
                <div>Nhà cung cấp: {suppliers.length}</div>
              </div>

              <div className="space-y-1">
                <div className="font-medium text-gray-700">Phạm vi</div>
                <div>Kỳ: {period}</div>
                <div>Khu vực: {region}</div>
              </div>

              <div className="space-y-1">
                <div className="font-medium text-gray-700">Dữ liệu trước</div>
                <div>
                  Có giá kỳ trước: {matrixData.products.filter(p => p.previousApprovedPrice).length} SP
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-medium text-gray-700">Cập nhật</div>
                <div>{matrixData.lastUpdated.toLocaleString('vi-VN')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ComparisonMatrix;