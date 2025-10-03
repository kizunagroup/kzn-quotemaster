"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ChevronsDown, ChevronsUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { PriceListMatrixData } from "@/lib/types/price-list.types";

export interface PriceMatrixProps {
  priceListData: PriceListMatrixData;
}

/**
 * Price Matrix Component
 * Displays price list data grouped by product category
 * with dynamic supplier columns and best price highlighting
 *
 * Features:
 * - Summary statistics bar
 * - VAT toggle (show/hide VAT %)
 * - Expand/collapse all categories
 * - Unified typography and terminology
 */
export function PriceMatrix({ priceListData }: PriceMatrixProps) {
  // State for VAT toggle and accordion expansion
  const [showVAT, setShowVAT] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof priceListData.products>();

    priceListData.products.forEach((product) => {
      const category = product.category || "Khác";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(product);
    });

    // Sort categories alphabetically
    return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [priceListData.products]);

  // Get sorted supplier list
  const sortedSuppliers = useMemo(() => {
    return [...priceListData.suppliers].sort((a, b) => a.code.localeCompare(b.code));
  }, [priceListData.suppliers]);

  // Helper function to get best price styling
  const getPriceStyle = (isBestPrice: boolean) => {
    if (isBestPrice) {
      return "bg-green-100 text-green-800 border border-green-200 font-medium shadow-sm";
    }
    return "bg-gray-50 text-gray-700 border border-gray-200";
  };

  // Toggle all categories
  const toggleAllCategories = () => {
    if (expandedCategories.length > 0) {
      setExpandedCategories([]);
    } else {
      setExpandedCategories(Array.from(productsByCategory.keys()));
    }
  };

  if (priceListData.products.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Không có hàng hóa nào trong bảng giá này</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vui lòng kiểm tra lại kỳ báo giá hoặc bếp đã chọn.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Price Matrix Table with Category Accordion */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-3">
            {/* Title */}
            <CardTitle>Chi tiết Bảng giá</CardTitle>

            {/* Context Info - Period & Kitchen */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Kỳ: {priceListData.period || "N/A"}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Bếp: {priceListData.teamName || "N/A"}</span>
            </div>

            {/* Summary Statistics Bar */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tổng hàng hóa:</span>
                <span className="font-semibold font-narrow">{priceListData.summary.totalProducts}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Nhà cung cấp:</span>
                <span className="font-semibold font-narrow">{priceListData.summary.totalSuppliers}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Hàng hóa có giá:</span>
                <span className="font-semibold font-narrow">{priceListData.summary.quotedProducts}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Độ phủ TB:</span>
                <span className="font-semibold font-narrow">{priceListData.summary.averageCoverage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Utility Action Buttons - Right Side */}
          <div className="flex items-center gap-2">
            {/* VAT Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVAT(!showVAT)}
            >
              {showVAT ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Đang xem giá sau thuế
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Đang xem giá chưa thuế
                </>
              )}
            </Button>

            {/* Expand/Collapse All Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCategories}
            >
              {expandedCategories.length > 0 ? (
                <>
                  <ChevronsUp className="h-4 w-4 mr-2" />
                  Thu gọn tất cả
                </>
              ) : (
                <>
                  <ChevronsDown className="h-4 w-4 mr-2" />
                  Mở rộng tất cả
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">

          {/* Category Accordion */}
          <Accordion
            type="multiple"
            value={expandedCategories}
            onValueChange={setExpandedCategories}
            className="w-full"
          >
            {Array.from(productsByCategory.entries()).map(([category, products]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{category}</span>
                    <Badge variant="secondary">{products.length} hàng hóa</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          {/* Column 1: Mã hàng hóa */}
                          <TableHead className="min-w-[100px]">Mã hàng hóa</TableHead>

                          {/* Column 2: Tên hàng hóa */}
                          <TableHead className="min-w-[200px]">Tên hàng hóa</TableHead>

                          {/* Dynamic supplier columns */}
                          {sortedSuppliers.map((supplier) => (
                            <TableHead key={supplier.id} className="min-w-[150px] text-right">
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
                        {products.map((product, index) => (
                          <TableRow
                            key={product.productId}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            {/* Column 1: Product Code with Unit - NO font-mono */}
                            <TableCell className="text-sm">
                              <div className="space-y-1">
                                <div className="font-medium">{product.productCode}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.unit}
                                </div>
                              </div>
                            </TableCell>

                            {/* Column 2: Product Name with Specification */}
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

                            {/* Dynamic Supplier Price Columns */}
                            {sortedSuppliers.map((supplier) => {
                              const supplierPrice = product.suppliers[supplier.id];

                              if (!supplierPrice) {
                                return (
                                  <TableCell key={supplier.id} className="text-right">
                                    <div className="text-gray-400 text-sm py-4">—</div>
                                  </TableCell>
                                );
                              }

                              const isBestPrice = supplierPrice.hasBestPrice;

                              // Toggle between prices based on VAT display
                              const displayPrice = showVAT
                                ? supplierPrice.totalPriceWithVAT
                                : supplierPrice.approvedPrice;

                              return (
                                <TableCell key={supplier.id} className="text-right text-sm font-narrow">
                                  <div className="space-y-2">
                                    {/* Price Display with Best Price Highlighting */}
                                    <div
                                      className={cn(
                                        "inline-block px-2 py-1 rounded text-sm font-narrow",
                                        getPriceStyle(isBestPrice)
                                      )}
                                    >
                                      {formatNumber(displayPrice)}
                                    </div>

                                    {/* Conditionally show VAT percentage */}
                                    {showVAT && supplierPrice.vatRate > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        Thuế GTGT ({supplierPrice.vatRate}%)
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

export default PriceMatrix;
