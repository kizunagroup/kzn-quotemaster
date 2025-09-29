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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
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

        <ScrollArea className="max-h-[75vh] pr-4">
          <div className="space-y-6">
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
              <>
                {/* Basic Information */}
                <Card>
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
                          <Badge
                            variant={
                              quotation.status === "approved"
                                ? "default"
                                : quotation.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {quotation.status === "pending" && "Chờ duyệt"}
                            {quotation.status === "approved" && "Đã duyệt"}
                            {quotation.status === "cancelled" && "Đã hủy"}
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

                    {quotation.notes && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            Ghi chú
                          </label>
                          <div className="text-sm bg-muted p-3 rounded-md">
                            {quotation.notes}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Quotation Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Danh sách Sản phẩm
                      <Badge variant="outline" className="ml-2">
                        {quotation.items?.length ?? 0} sản phẩm
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">STT</TableHead>
                            <TableHead>Mã sản phẩm</TableHead>
                            <TableHead>Tên sản phẩm</TableHead>
                            <TableHead>Đơn vị</TableHead>
                            <TableHead className="text-right">
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
                            <TableHead className="text-right">Đơn giá</TableHead>
                            <TableHead className="text-right">Thành tiền</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quotation.items && Array.isArray(quotation.items) && quotation.items.length > 0 ? (
                            quotation.items.map((item, index) => {
                              // Defensive checks for item data
                              if (!item || !item.product) return null;

                              // SMART CLIENT: Safe string-to-number conversion for display
                              // Server returns decimals as strings, we convert them here for calculations
                              const baseQuantity = parseFloat(String(item.baseQuantity || 0)) || 0;
                              const initialPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              const totalPrice = baseQuantity * initialPrice;

                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {item.product?.productCode ?? 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.product?.name ?? 'Sản phẩm không xác định'}</div>
                                    {item.product?.specification && (
                                      <div className="text-sm text-muted-foreground">
                                        {item.product.specification}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{item.product?.unit ?? 'N/A'}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {baseQuantity.toLocaleString('vi-VN')}
                                </TableCell>
                                <TableCell className="text-right">
                                  <PriceBadge
                                    price={initialPrice}
                                    size="sm"
                                    className="justify-end"
                                    showCurrency={false}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <PriceBadge
                                    price={totalPrice}
                                    size="sm"
                                    className="justify-end font-medium"
                                    showCurrency={false}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                Không có sản phẩm nào trong báo giá này
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Tổng giá trị báo giá:</span>
                        <PriceBadge
                          price={(quotation.items ?? []).reduce(
                            (sum, item) => {
                              if (!item || !item.product) return sum;
                              // SMART CLIENT: Safe string-to-number conversion for summary calculation
                              const baseQuantity = parseFloat(String(item.baseQuantity || 0)) || 0;
                              const initialPrice = parseFloat(String(item.initialPrice || 0)) || 0;
                              return sum + (baseQuantity * initialPrice);
                            },
                            0
                          )}
                          size="lg"
                          className="text-lg"
                          showCurrency={false}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
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