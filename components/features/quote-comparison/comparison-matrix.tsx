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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
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
  const suppliers = matrixData.suppliers.sort((a, b) => a.code.localeCompare(b.code));

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

  // Helper function to get price styling based on best price only
  const getPriceStyle = (isBestPrice: boolean) => {
    // Best price gets green bold text
    if (isBestPrice) {
      return "text-green-600 font-bold";
    }

    // Default for all other prices
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
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  {/* Column 1: Mã SP */}
                  <TableHead className="min-w-[100px]">Mã SP</TableHead>

                  {/* Column 2: Tên SP (with specification and unit) */}
                  <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>

                  {/* Column 3: Số lượng cơ sở */}
                  <TableHead className="min-w-[120px] text-center">Số lượng cơ sở</TableHead>

                  {/* Column 4: Giá cơ sở */}
                  <TableHead className="min-w-[120px] text-center">Giá cơ sở</TableHead>

                  {/* Column 5: Giá duyệt kỳ trước */}
                  <TableHead className="min-w-[120px] text-center">Giá duyệt kỳ trước</TableHead>

                  {/* Dynamic supplier columns - simplified headers */}
                  {suppliers.map((supplier) => {
                    // Get border color based on quotation status from matrixData
                    const supplierData = matrixData.availableSuppliers.find(s => s.id === supplier.id);
                    const getBorderClass = (status?: string) => {
                      if (!status) return '';
                      switch (status) {
                        case 'approved':
                          return 'border-b-2 border-green-500';
                        case 'negotiation':
                          return 'border-b-2 border-orange-500';
                        case 'pending':
                          return 'border-b-2 border-slate-400';
                        default:
                          return '';
                      }
                    };

                    return (
                      <TableHead
                        key={supplier.id}
                        className={cn(
                          "min-w-[150px] text-center",
                          getBorderClass(supplierData?.quotationStatus)
                        )}
                      >
                        <div className="space-y-1">
                          <div className="font-medium">{supplier.code}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {supplier.name}
                          </div>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>

              <TableBody>
                {matrixData.products.map((product, index) => {
                  // Calculate base price (lowest initial price or first available)
                  const supplierPrices = Object.values(product.suppliers).filter(s => s.initialPrice);
                  const basePrice = supplierPrices.length > 0
                    ? Math.min(...supplierPrices.map(s => s.initialPrice || Infinity))
                    : undefined;

                  return (
                    <TableRow
                      key={product.productId}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {/* Column 1: Product Code */}
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{product.productCode}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.unit}
                          </div>
                        </div>
                      </TableCell>

                      {/* Column 2: Product Name (with specification only) */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{product.productName}</div>
                          {product.specification && (
                            <div className="text-sm text-muted-foreground">
                              {product.specification}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Column 3: Base Quantity */}
                      <TableCell className="text-center text-sm font-jakarta">
                        <div className="font-medium text-gray-600">
                          {product.baseQuantity?.toLocaleString('vi-VN') || product.quantity.toLocaleString('vi-VN')}
                        </div>
                      </TableCell>

                      {/* Column 4: Base Price */}
                      <TableCell className="text-center text-sm font-jakarta">
                        {basePrice ? (
                          <div className="font-medium text-gray-600">
                            {formatPrice(basePrice)}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">N/A</div>
                        )}
                      </TableCell>

                      {/* Column 5: Previous Approved Price */}
                      <TableCell className="text-center text-sm font-jakarta">
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
                          <TableCell key={supplier.id} className="text-center text-sm font-jakarta">
                            <div className="space-y-2">
                              {/* Current Price Display with Color Coding */}
                              <div className={cn(
                                "text-sm px-2 py-1 rounded font-jakarta",
                                getPriceStyle(isBestPrice)
                              )}>
                                {formatPrice(currentPrice)}
                              </div>

                              {/* Variance Display with Arrow Icons */}
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

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ComparisonMatrix;