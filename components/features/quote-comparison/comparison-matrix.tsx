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
    // Defensive check for valid quotation ID
    if (!quotationId || quotationId <= 0) {
      console.error('Error: Không thể xác định báo giá', { quotationId, supplierName });
      // TODO: Show error toast message
      return;
    }

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
    // Defensive check for valid quotation ID
    if (!quotationId || quotationId <= 0) {
      console.error('Error: Không thể xác định báo giá', { quotationId, supplierName });
      // TODO: Show error toast message
      return;
    }

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

  // Helper function to format price (simplified without currency symbol)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Helper function to get price styling based on status
  const getPriceStyle = (supplierData: any, isBestPrice: boolean) => {
    if (supplierData.approvedPrice) {
      return "bg-green-100 text-green-800 font-medium";
    }
    if (isBestPrice) {
      return "text-green-600 font-bold";
    }
    if (supplierData.negotiatedPrice) {
      return "text-orange-600";
    }
    return "text-gray-900";
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
                            SL: {product.quantity.toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </TableCell>

                      {/* Base Price */}
                      <TableCell className="text-center font-mono">
                        {basePrice ? (
                          <div className="font-medium text-gray-600">
                            {formatPrice(basePrice)}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">N/A</div>
                        )}
                      </TableCell>

                      {/* Previous Approved Price */}
                      <TableCell className="text-center font-mono">
                        {product.previousApprovedPrice ? (
                          <div className="font-medium text-blue-600">
                            {formatPrice(product.previousApprovedPrice)}
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
                          <TableCell key={supplier.id} className="text-center font-mono">
                            <div className="space-y-2">
                              {/* Current Price Display with Color Coding */}
                              <div className={cn(
                                "text-lg px-2 py-1 rounded",
                                getPriceStyle(supplierData, isBestPrice)
                              )}>
                                {formatPrice(currentPrice)}
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

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6"
                                  onClick={() => handleNegotiate(supplierData.id, supplier.name)}
                                  disabled={loadingActions[`negotiate_${supplierData.id}`]}
                                >
                                  {loadingActions[`negotiate_${supplierData.id}`] ? 'Đang xử lý...' : 'Đàm phán'}
                                </Button>
                                <Button
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => handleApprove(supplierData.id, supplier.name)}
                                  disabled={loadingActions[`approve_${supplierData.id}`]}
                                >
                                  {loadingActions[`approve_${supplierData.id}`] ? 'Đang xử lý...' : 'Duyệt giá'}
                                </Button>
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

          {/* Legend for Color System */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <div className="font-medium text-gray-700">Hệ thống màu sắc giá cả</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border rounded"></div>
                  <span>Đã duyệt</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border rounded font-bold text-green-600 flex items-center justify-center text-xs">G</div>
                  <span>Giá tốt nhất</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border rounded text-orange-600 flex items-center justify-center text-xs">N</div>
                  <span>Đàm phán</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border rounded text-gray-900 flex items-center justify-center text-xs">B</div>
                  <span>Ban đầu</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ComparisonMatrix;