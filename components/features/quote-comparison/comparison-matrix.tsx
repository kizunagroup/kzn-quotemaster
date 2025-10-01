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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
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
  activeFilter?: 'all' | 'price_increase' | 'price_decrease' | 'no_quotes';
  className?: string;
}

export function ComparisonMatrix({ matrixData, activeFilter = 'all', className }: ComparisonMatrixProps) {

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
    const category = product.category || 'Unknown';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof matrixData.products>);

  // Check if we have multiple categories to decide on display mode
  const hasMultipleCategories = Object.keys(productsByCategory).length > 1;

  // Helper to calculate variance percentage with fallback logic
  const calculateVariancePercentage = (product: typeof matrixData.products[0], supplierId: number): number | null => {
    const supplierData = product.suppliers[supplierId];
    if (!supplierData || !supplierData.hasPrice) return null;

    const currentPrice = supplierData.pricePerUnit;

    // Priority 1: Use variancePercentage if available (calculated from previousApprovedPrice)
    if (supplierData.variancePercentage !== undefined && supplierData.variancePercentage !== null) {
      return supplierData.variancePercentage;
    }

    // Priority 2: Calculate from previousApprovedPrice if available
    if (product.previousApprovedPrice && product.previousApprovedPrice > 0) {
      return ((currentPrice - product.previousApprovedPrice) / product.previousApprovedPrice) * 100;
    }

    // Priority 3: Fallback to basePrice (lowest initial price)
    const allSupplierPrices = Object.values(product.suppliers)
      .filter((s: any) => s.initialPrice && s.initialPrice > 0)
      .map((s: any) => s.initialPrice);
    if (allSupplierPrices.length > 0) {
      const basePrice = Math.min(...allSupplierPrices);
      if (basePrice > 0) {
        return ((currentPrice - basePrice) / basePrice) * 100;
      }
    }

    return null;
  };

  // Apply Quick View filtering and sorting
  const applyQuickViewFilter = (products: typeof matrixData.products): typeof matrixData.products => {
    let filtered = [...products];

    switch (activeFilter) {
      case 'price_increase': {
        // Filter products with price increases and sort by highest increase percentage
        filtered = filtered.filter(product => {
          // Check if any supplier has a positive variance
          return Object.keys(product.suppliers).some(supplierIdStr => {
            const supplierId = parseInt(supplierIdStr);
            const variance = calculateVariancePercentage(product, supplierId);
            return variance !== null && variance > 0.5;
          });
        });
        // Sort by maximum variance percentage (descending)
        filtered.sort((a, b) => {
          const maxVarianceA = Math.max(
            ...Object.keys(a.suppliers).map(id => calculateVariancePercentage(a, parseInt(id)) || 0)
          );
          const maxVarianceB = Math.max(
            ...Object.keys(b.suppliers).map(id => calculateVariancePercentage(b, parseInt(id)) || 0)
          );
          return maxVarianceB - maxVarianceA;
        });
        break;
      }
      case 'price_decrease': {
        // Filter products with price decreases and sort by highest decrease percentage
        filtered = filtered.filter(product => {
          // Check if any supplier has a negative variance
          return Object.keys(product.suppliers).some(supplierIdStr => {
            const supplierId = parseInt(supplierIdStr);
            const variance = calculateVariancePercentage(product, supplierId);
            return variance !== null && variance < -0.5;
          });
        });
        // Sort by minimum variance percentage (ascending - most negative first)
        filtered.sort((a, b) => {
          const minVarianceA = Math.min(
            ...Object.keys(a.suppliers).map(id => calculateVariancePercentage(a, parseInt(id)) || 0)
          );
          const minVarianceB = Math.min(
            ...Object.keys(b.suppliers).map(id => calculateVariancePercentage(b, parseInt(id)) || 0)
          );
          return minVarianceA - minVarianceB;
        });
        break;
      }
      case 'no_quotes': {
        // Filter products with at least one supplier missing quotes
        filtered = filtered.filter(product => {
          const totalSuppliers = suppliers.length;
          const suppliersWithQuotes = Object.keys(product.suppliers).length;
          return suppliersWithQuotes < totalSuppliers;
        });
        break;
      }
      case 'all':
      default:
        // No filtering, keep original order
        break;
    }

    return filtered;
  };

  // Apply filter to each category
  const filteredProductsByCategory = Object.entries(productsByCategory).reduce((acc, [category, products]) => {
    const filtered = applyQuickViewFilter(products);
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof matrixData.products>);

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
    // STEP 1: Filter suppliers to only those relevant to this category
    // Collect all unique supplier IDs that have quoted at least one product in this category
    const categorySupplierIds = new Set<number>();
    products.forEach(product => {
      Object.keys(product.suppliers).forEach(supplierIdStr => {
        categorySupplierIds.add(parseInt(supplierIdStr));
      });
    });

    // STEP 2: Create filtered supplier list (only suppliers with quotes in this category)
    const categorySuppliers = suppliers
      .filter(supplier => categorySupplierIds.has(supplier.id))
      .sort((a, b) => a.code.localeCompare(b.code));

    console.log(
      `[ComparisonMatrix] Category "${categoryName}": ${categorySuppliers.length} relevant suppliers out of ${suppliers.length} total`
    );

    return (
      <Table key={categoryName}>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow>
            {/* Column 1: Mã SP */}
            <TableHead className="min-w-[100px]">Mã SP</TableHead>

            {/* Column 2: Tên SP (with specification and unit) */}
            <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>

            {/* Column 3: Số lượng cơ sở */}
            <TableHead className="min-w-[120px] text-right">Số lượng cơ sở</TableHead>

            {/* Column 4: Giá cơ sở */}
            <TableHead className="min-w-[120px] text-right">Giá cơ sở</TableHead>

            {/* Column 5: Giá duyệt kỳ trước */}
            <TableHead className="min-w-[120px] text-right">Giá duyệt kỳ trước</TableHead>

            {/* Dynamic supplier columns - CONTEXT-AWARE: Only suppliers with quotes in this category */}
            {categorySuppliers.map((supplier) => {
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
                    "min-w-[150px] text-right",
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
                <TableCell className="text-right text-sm font-narrow">
                  <div className="font-medium text-gray-600">
                    {formatNumber(product.baseQuantity || product.quantity)}
                  </div>
                </TableCell>

                {/* Column 4: Base Price */}
                <TableCell className="text-right text-sm font-narrow">
                  {basePrice ? (
                    <div className="font-medium text-gray-600">
                      {formatNumber(basePrice)}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">N/A</div>
                  )}
                </TableCell>

                {/* Column 5: Previous Approved Price */}
                <TableCell className="text-right text-sm font-narrow">
                  {product.previousApprovedPrice ? (
                    <div className="font-medium text-blue-600">
                      {formatNumber(product.previousApprovedPrice)}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">-</div>
                  )}
                </TableCell>

                {/* Dynamic supplier price cells - CONTEXT-AWARE: Only relevant suppliers for this category */}
                {categorySuppliers.map((supplier) => {
                  const supplierData = product.suppliers[supplier.id];

                  if (!supplierData) {
                    return (
                      <TableCell key={supplier.id} className="text-right">
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
                    <TableCell key={supplier.id} className="text-right text-sm font-narrow">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-2 cursor-pointer">
                            {/* Current Price Display with Variance Icon */}
                            <div className="flex items-center justify-end gap-2">
                              <div className={cn(
                                "text-sm px-2 py-1 rounded font-narrow",
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
                                    <TrendingUpIcon className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <TrendingDownIcon className="h-3 w-3 text-green-600" />
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
                                  "flex items-center gap-1",
                                  baseVariance.percentage > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  {baseVariance.percentage > 0 ? (
                                    <TrendingUpIcon className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <TrendingDownIcon className="h-3 w-3 text-green-600" />
                                  )}
                                  <span>
                                    {baseVariance.difference > 0 ? '+' : ''}
                                    {formatNumber(baseVariance.difference)} ({baseVariance.percentage > 0 ? '+' : ''}{formatPercentage(baseVariance.percentage)})
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Comparison vs Previous Period Best Price */}
                            {variance && (
                              <div>
                                <div className="font-medium text-foreground">So với Giá tốt nhất kỳ trước:</div>
                                <div className={cn(
                                  "flex items-center gap-1",
                                  variance.percentage > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                  {variance.percentage > 0 ? (
                                    <TrendingUpIcon className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <TrendingDownIcon className="h-3 w-3 text-green-600" />
                                  )}
                                  <span>
                                    {variance.difference > 0 ? '+' : ''}
                                    {formatNumber(variance.difference)} ({variance.percentage > 0 ? '+' : ''}{formatPercentage(variance.percentage)})
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Comparison vs This Supplier's Previous Price */}
                            {supplierData.previousPriceFromThisSupplier && (
                              <div>
                                <div className="font-medium text-foreground">So với Giá duyệt kỳ trước NCC này:</div>
                                {(() => {
                                  const previousSupplierPrice = supplierData.previousPriceFromThisSupplier!;
                                  const supplierVariance = calculateVariance(currentPrice, previousSupplierPrice);
                                  return supplierVariance ? (
                                    <div className={cn(
                                      "flex items-center gap-1",
                                      supplierVariance.percentage > 0 ? "text-red-600" : "text-green-600"
                                    )}>
                                      {supplierVariance.percentage > 0 ? (
                                        <TrendingUpIcon className="h-3 w-3 text-red-600" />
                                      ) : (
                                        <TrendingDownIcon className="h-3 w-3 text-green-600" />
                                      )}
                                      <span>
                                        {supplierVariance.difference > 0 ? '+' : ''}
                                        {formatNumber(supplierVariance.difference)} ({supplierVariance.percentage > 0 ? '+' : ''}{formatPercentage(supplierVariance.percentage)})
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
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
      <div className={cn("w-full", className)}>
        {/* Main Table Content */}
        <div className="overflow-x-auto">
          {Object.keys(filteredProductsByCategory).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Không tìm thấy sản phẩm phù hợp với bộ lọc đã chọn.</p>
            </div>
          ) : hasMultipleCategories ? (
            // Multiple categories: use accordion grouping
            <Accordion type="multiple" defaultValue={Object.keys(filteredProductsByCategory)} className="w-full">
              {Object.entries(filteredProductsByCategory).map(([categoryName, products]) => (
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
            renderCategoryTable(
              Object.keys(filteredProductsByCategory)[0] || 'All',
              Object.values(filteredProductsByCategory)[0] || []
            )
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default ComparisonMatrix;