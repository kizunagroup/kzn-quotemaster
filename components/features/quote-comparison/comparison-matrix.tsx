"use client";

import * as React from "react";
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
import { TrendingUpIcon, TrendingDownIcon, ArrowUp, ArrowDown } from "lucide-react";
import { cn, formatNumber, formatPercentage } from "@/lib/utils";
import type { ComparisonMatrixData } from "@/lib/types/quote-comparison.types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface ComparisonMatrixProps {
  matrixData: ComparisonMatrixData;
  className?: string;
}

export function ComparisonMatrix({ matrixData, className }: ComparisonMatrixProps) {
  // Early return if no data
  if (!matrixData || matrixData.products.length === 0) {
    return (
      <div className={cn("w-full text-center text-gray-500 py-8", className)}>
        <p>Không có dữ liệu sản phẩm để hiển thị.</p>
        <p className="text-sm mt-2">
          Vui lòng kiểm tra lại các tiêu chí lọc hoặc đảm bảo có báo giá trong kỳ này.
        </p>
      </div>
    );
  }

  const { period, region, categories } = matrixData;
  const suppliers = matrixData.suppliers.sort((a, b) => a.code.localeCompare(b.code));

  // Group products by category
  const productsByCategory = matrixData.products.reduce((acc, product) => {
    // Use product.category field that should now be included from backend
    const category = (product as any).category || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof matrixData.products>);

  // Check if we have multiple categories to decide on display mode
  const hasMultipleCategories = Object.keys(productsByCategory).length > 1;

  // Helper function to calculate price variance
  const calculateVariance = (currentPrice: number, previousPrice?: number) => {
    if (!previousPrice || previousPrice === 0) return null;
    const difference = currentPrice - previousPrice;
    const percentage = (difference / previousPrice) * 100;
    return { difference, percentage };
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

  // Helper function to render a comparison table for a category
  const renderCategoryTable = (categoryName: string, products: typeof matrixData.products) => {
    return (
      <Table key={categoryName}>
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
          {products.map((product, index) => {
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
                    {formatNumber(product.baseQuantity || product.quantity)}
                  </div>
                </TableCell>

                {/* Column 4: Base Price */}
                <TableCell className="text-center text-sm font-jakarta">
                  {basePrice ? (
                    <div className="font-medium text-gray-600">
                      {formatNumber(basePrice)}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">N/A</div>
                  )}
                </TableCell>

                {/* Column 5: Previous Approved Price */}
                <TableCell className="text-center text-sm font-jakarta">
                  {product.previousApprovedPrice ? (
                    <div className="font-medium text-blue-600">
                      {formatNumber(product.previousApprovedPrice)}
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

                  // Calculate base price (lowest initial price) for comparison
                  const supplierPrices = Object.values(product.suppliers).filter(s => s.initialPrice);
                  const basePrice = supplierPrices.length > 0
                    ? Math.min(...supplierPrices.map(s => s.initialPrice || Infinity))
                    : undefined;

                  // Calculate variance vs base price
                  const baseVariance = basePrice ? calculateVariance(currentPrice, basePrice) : null;

                  return (
                    <TableCell key={supplier.id} className="text-center text-sm font-jakarta">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-2 cursor-pointer">
                            {/* Current Price Display with Variance Icon */}
                            <div className="flex items-center justify-center gap-2">
                              <div className={cn(
                                "text-sm px-2 py-1 rounded font-jakarta",
                                getPriceStyle(isBestPrice)
                              )}>
                                {formatNumber(currentPrice)}
                              </div>

                              {/* Variance Arrow Icon */}
                              {variance && (
                                <div className={cn(
                                  "flex items-center",
                                  variance.percentage > 0 ? "text-red-500" : "text-green-500"
                                )}>
                                  {variance.percentage > 0 ? (
                                    <ArrowUp className="h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Small percentage display */}
                            {variance && (
                              <div className={cn(
                                "text-xs",
                                variance.percentage > 0 ? "text-red-600" : "text-green-600"
                              )}>
                                {variance.percentage > 0 ? '+' : ''}{formatPercentage(variance.percentage)}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background border">
                          <div className="space-y-2 text-sm">
                            {/* Comparison vs Base Price */}
                            {baseVariance && (
                              <div>
                                <div className="font-medium text-foreground">So với Giá cơ sở:</div>
                                <div className={cn(
                                  baseVariance.percentage > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  {baseVariance.difference > 0 ? '+' : ''}
                                  {formatNumber(baseVariance.difference)} ({baseVariance.percentage > 0 ? '+' : ''}{formatPercentage(baseVariance.percentage)})
                                </div>
                              </div>
                            )}

                            {/* Comparison vs Previous Period */}
                            {variance && (
                              <div>
                                <div className="font-medium text-foreground">So với Kỳ trước:</div>
                                <div className={cn(
                                  variance.percentage > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  {variance.difference > 0 ? '+' : ''}
                                  {formatNumber(variance.difference)} ({variance.percentage > 0 ? '+' : ''}{formatPercentage(variance.percentage)})
                                </div>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn("w-full overflow-x-auto", className)}>
        {hasMultipleCategories ? (
          // Multiple categories: use accordion grouping
          <Accordion type="multiple" defaultValue={Object.keys(productsByCategory)} className="w-full">
            {Object.entries(productsByCategory).map(([categoryName, products]) => (
              <AccordionItem key={categoryName} value={categoryName}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Nhóm hàng: {categoryName}</span>
                    <Badge variant="outline" className="text-xs">
                      {products.length} sản phẩm
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    {renderCategoryTable(categoryName, products)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          // Single category: render table directly
          renderCategoryTable(Object.keys(productsByCategory)[0] || 'All', matrixData.products)
        )}
      </div>
    </TooltipProvider>
  );
}

export default ComparisonMatrix;