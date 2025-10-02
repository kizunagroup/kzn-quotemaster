"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, Calendar, MapPin, Building2, Package, Eye, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PriceBadge } from "@/components/ui/price-badge";
import { getQuotationDetails } from "@/lib/actions/quotations.actions";
import type { QuotationDetailsWithItems } from "@/lib/types/quotations.types";
import { getStatusLabel, getStatusClassName } from "@/lib/utils/status-styles";
import { formatNumber } from "@/lib/utils";

interface QuoteDetailsModalProps {
  quotationId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LoadingState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: QuotationDetailsWithItems }
  | { type: "error"; error: string };

export function QuoteDetailsModal({
  quotationId,
  open,
  onOpenChange,
}: QuoteDetailsModalProps) {
  const [state, setState] = React.useState<LoadingState>({ type: "idle" });

  // Fetch quotation details when modal opens
  React.useEffect(() => {
    if (open && quotationId) {
      setState({ type: "loading" });

      getQuotationDetails(quotationId)
        .then((result) => {
          // Check if result has error property (error case) or is data object (success case)
          if ('error' in result) {
            setState({
              type: "error",
              error: result.error || "Không thể tải thông tin báo giá"
            });
            toast.error("Không thể tải thông tin báo giá");
          } else {
            // Result is QuotationDetailsWithItems data object
            setState({ type: "success", data: result });
          }
        })
        .catch((error) => {
          console.error("Error fetching quotation details:", error);
          setState({
            type: "error",
            error: error instanceof Error ? error.message : "Lỗi không xác định"
          });
          toast.error("Có lỗi xảy ra khi tải thông tin báo giá");
        });
    } else if (!open) {
      setState({ type: "idle" });
    }
  }, [open, quotationId]);

  const quotation = state.type === "success" ? state.data : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chi tiết Báo giá
            {quotation && (
              <Badge variant="outline" className="ml-2">
                #{quotation.id}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về báo giá từ nhà cung cấp
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {state.type === "loading" && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">
                Đang tải thông tin báo giá...
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.type === "error" && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="text-destructive font-medium">
                Không thể tải thông tin báo giá
              </div>
              <div className="text-sm text-muted-foreground">
                {state.error}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (quotationId) {
                    setState({ type: "loading" });
                    // Trigger reload
                    const event = new CustomEvent("reload");
                    window.dispatchEvent(event);
                  }
                }}
              >
                Thử lại
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {quotation && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Basic Information - Fixed */}
            <Card className="flex-shrink-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5" />
                      Thông tin Báo giá
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">
                          Nhà cung cấp
                        </label>
                        <div className="font-medium">{quotation.supplier.name}</div>
                        {quotation.supplier.email && (
                          <div className="text-sm text-muted-foreground">
                            {quotation.supplier.email}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Kỳ báo giá
                        </label>
                        <div className="font-medium">
                          {quotation.period}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Khu vực
                        </label>
                        <div className="font-medium">{quotation.region}</div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">
                          Trạng thái
                        </label>
                        <div>
                          <Badge className={getStatusClassName(quotation.status)}>
                            {getStatusLabel(quotation.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">
                          Ngày tạo
                        </label>
                        <div className="text-sm">
                          {format(new Date(quotation.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Quotation Items - Scrollable */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Danh sách Sản phẩm
                      <Badge variant="outline" className="ml-2">
                        {quotation.items?.length ?? 0} sản phẩm
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-0 px-6 pb-6">
                    <div className="relative w-full">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm [&_tr]:border-b">
                          <tr className="border-b transition-colors hover:bg-muted/50">
                            <TableHead className="text-center text-sm bg-white">STT</TableHead>
                            <TableHead className="text-sm bg-white">Mã SP</TableHead>
                            <TableHead className="text-sm bg-white">Tên sản phẩm</TableHead>
                            <TableHead className="text-sm bg-white">Đơn vị</TableHead>
                            <TableHead className="text-right text-sm bg-white">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    Số lượng
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Số lượng cơ sở dùng để tham khảo</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="text-right text-sm bg-white">Đơn giá</TableHead>
                            <TableHead className="text-right text-sm bg-white">VAT %</TableHead>
                            <TableHead className="text-right text-sm bg-white">Tiền thuế VAT</TableHead>
                            <TableHead className="text-right text-sm font-semibold bg-white">Thành tiền</TableHead>
                          </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                          {quotation.items && Array.isArray(quotation.items) && quotation.items.length > 0 ? (
                            quotation.items.map((item, index) => {
                              // Defensive checks for item data
                              if (!item || !item.product) return null;

                              // SMART CLIENT: Safe string-to-number conversion for display
                              // Server returns decimals as strings, we convert them here for calculations
                              // Use baseQuantity from product as reference quantity for pricing calculation
                              const quantity = parseFloat(String(item.baseQuantity || item.quantity || 0)) || 0;
                              const vatRate = parseFloat(String(item.vatPercentage || 0)) || 0;

                              // Smart price selection based on quotation status
                              let displayPrice = 0;
                              if (quotation.status === 'approved' && item.approvedPrice) {
                                displayPrice = parseFloat(String(item.approvedPrice)) || 0;
                              } else if (quotation.status === 'negotiation' && item.negotiatedPrice) {
                                displayPrice = parseFloat(String(item.negotiatedPrice)) || 0;
                              } else {
                                displayPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              }

                              // Calculate VAT and total
                              const subtotal = quantity * displayPrice;
                              const vatAmount = subtotal * (vatRate / 100);
                              const totalPrice = subtotal + vatAmount;

                            return (
                              <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                <TableCell className="text-center font-medium text-sm">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {item.product?.productCode ?? 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium text-sm">{item.product?.name ?? 'Sản phẩm không xác định'}</div>
                                    {item.product?.specification && (
                                      <div className="text-sm text-muted-foreground">
                                        {item.product.specification}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">{item.product?.unit ?? 'N/A'}</TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatNumber(quantity)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatNumber(displayPrice)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {vatRate.toFixed(0)}%
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {formatNumber(vatAmount)}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatNumber(totalPrice)}
                                </TableCell>
                              </tr>
                            );
                          })
                          ) : (
                            <tr className="border-b">
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                                Không có sản phẩm nào trong báo giá này
                              </TableCell>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>

                  {/* Summary Section - Outside scrollable area */}
                  <div className="flex-shrink-0 px-6 py-4 border-t space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Tổng giá trị (chưa VAT):</span>
                        <span className="font-medium">
                          {formatNumber((quotation.items ?? []).reduce(
                            (sum, item) => {
                              if (!item || !item.product) return sum;
                              const quantity = parseFloat(String(item.baseQuantity || item.quantity || 0)) || 0;
                              let displayPrice = 0;
                              if (quotation.status === 'approved' && item.approvedPrice) {
                                displayPrice = parseFloat(String(item.approvedPrice)) || 0;
                              } else if (quotation.status === 'negotiation' && item.negotiatedPrice) {
                                displayPrice = parseFloat(String(item.negotiatedPrice)) || 0;
                              } else {
                                displayPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              }
                              return sum + (quantity * displayPrice);
                            },
                            0
                          ))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Tổng thuế VAT:</span>
                        <span className="font-medium">
                          {formatNumber((quotation.items ?? []).reduce(
                            (sum, item) => {
                              if (!item || !item.product) return sum;
                              const quantity = parseFloat(String(item.baseQuantity || item.quantity || 0)) || 0;
                              const vatRate = parseFloat(String(item.vatPercentage || 0)) || 0;
                              let displayPrice = 0;
                              if (quotation.status === 'approved' && item.approvedPrice) {
                                displayPrice = parseFloat(String(item.approvedPrice)) || 0;
                              } else if (quotation.status === 'negotiation' && item.negotiatedPrice) {
                                displayPrice = parseFloat(String(item.negotiatedPrice)) || 0;
                              } else {
                                displayPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              }
                              const subtotal = quantity * displayPrice;
                              const vatAmount = subtotal * (vatRate / 100);
                              return sum + vatAmount;
                            },
                            0
                          ))}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-base font-bold">Tổng giá trị báo giá:</span>
                        <span className="text-base font-bold text-primary">
                          {formatNumber((quotation.items ?? []).reduce(
                            (sum, item) => {
                              if (!item || !item.product) return sum;
                              const quantity = parseFloat(String(item.baseQuantity || item.quantity || 0)) || 0;
                              const vatRate = parseFloat(String(item.vatPercentage || 0)) || 0;
                              let displayPrice = 0;
                              if (quotation.status === 'approved' && item.approvedPrice) {
                                displayPrice = parseFloat(String(item.approvedPrice)) || 0;
                              } else if (quotation.status === 'negotiation' && item.negotiatedPrice) {
                                displayPrice = parseFloat(String(item.negotiatedPrice)) || 0;
                              } else {
                                displayPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              }
                              const subtotal = quantity * displayPrice;
                              const vatAmount = subtotal * (vatRate / 100);
                              const totalPrice = subtotal + vatAmount;
                              return sum + totalPrice;
                            },
                            0
                          ))}
                        </span>
                      </div>
                  </div>
                </Card>
          </div>
            )}


        <div className="flex justify-end pt-4 border-t mt-auto flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}