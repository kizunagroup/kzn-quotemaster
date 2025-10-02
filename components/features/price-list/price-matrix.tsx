"use client";

import { useMemo } from "react";
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
import { PriceBadge } from "@/components/ui/price-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PriceListMatrixData } from "@/lib/actions/price-list.actions";

export interface PriceMatrixProps {
  priceListData: PriceListMatrixData;
}

/**
 * Price Matrix Component
 * Displays price list data grouped by product category
 * with dynamic supplier columns and best price highlighting
 */
export function PriceMatrix({ priceListData }: PriceMatrixProps) {
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

  if (priceListData.products.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Không có sản phẩm nào trong bảng giá này</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{priceListData.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Tổng số sản phẩm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{priceListData.summary.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Nhà cung cấp</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{priceListData.summary.quotedProducts}</div>
            <p className="text-xs text-muted-foreground">Sản phẩm có báo giá</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {priceListData.summary.averageCoverage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Độ phủ trung bình</p>
          </CardContent>
        </Card>
      </div>

      {/* Price Matrix Table with Category Accordion */}
      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full" defaultValue={Array.from(productsByCategory.keys())}>
            {Array.from(productsByCategory.entries()).map(([category, products]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{category}</span>
                    <Badge variant="secondary">{products.length} sản phẩm</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Mã SP</TableHead>
                          <TableHead className="min-w-[200px]">Tên sản phẩm</TableHead>
                          {sortedSuppliers.map((supplier) => (
                            <TableHead key={supplier.id} className="text-center min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold">{supplier.code}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  {supplier.name}
                                </span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.productId}>
                            {/* Product Code */}
                            <TableCell className="font-mono text-sm">
                              {product.productCode}
                            </TableCell>

                            {/* Product Name with Specification and Unit */}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{product.productName}</span>
                                {product.specification && (
                                  <span className="text-xs text-muted-foreground">
                                    {product.specification}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Đơn vị: {product.unit}
                                </span>
                              </div>
                            </TableCell>

                            {/* Dynamic Supplier Price Columns */}
                            {sortedSuppliers.map((supplier) => {
                              const supplierPrice = product.suppliers[supplier.id];

                              return (
                                <TableCell key={supplier.id} className="text-center">
                                  {supplierPrice ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <PriceBadge
                                        price={supplierPrice.totalPriceWithVAT}
                                        isBestPrice={supplierPrice.hasBestPrice}
                                        showBestPriceIcon={true}
                                        size="sm"
                                      />
                                      {supplierPrice.vatRate > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          VAT: {supplierPrice.vatRate}%
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
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

      {/* Supplier Coverage Summary */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Chi tiết nhà cung cấp</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSuppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{supplier.code}</span>
                      <Badge variant="outline">{supplier.coveragePercentage.toFixed(1)}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{supplier.name}</p>
                    <div className="text-xs text-muted-foreground">
                      <p>
                        Báo giá: {supplier.quotedProducts}/{supplier.totalProducts} sản phẩm
                      </p>
                      {supplier.contactPerson && <p>Liên hệ: {supplier.contactPerson}</p>}
                      {supplier.phone && <p>SĐT: {supplier.phone}</p>}
                      {supplier.email && <p>Email: {supplier.email}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PriceMatrix;
