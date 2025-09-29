"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Quotation } from "@/lib/hooks/use-quotations";

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
}

// Helper functions for formatting and display
const formatDate = (date: Date | string | null): string => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatPeriod = (period: string): string => {
  try {
    const [year, month, day] = period.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return period;
  }
};

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toLowerCase()) {
    case "approved":
      return "default";
    case "pending":
      return "outline";
    case "negotiation":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusDisplay = (status: string): string => {
  switch (status.toLowerCase()) {
    case "pending":
      return "Chờ Duyệt";
    case "approved":
      return "Đã Duyệt";
    case "negotiation":
      return "Đang Thương Lượng";
    case "cancelled":
      return "Đã Hủy";
    default:
      return status;
  }
};

// Mock quote items data structure (to be replaced with actual data in future)
interface QuoteItem {
  id: number;
  productCode: string;
  productName: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatPercentage: number;
  notes?: string;
}

// Mock data for demonstration (will be replaced with actual API data)
const getMockQuoteItems = (quotationId: string): QuoteItem[] => [
  {
    id: 1,
    productCode: "SP001",
    productName: "Thịt heo ba chỉ",
    specification: "Thịt tươi, đông lạnh",
    unit: "kg",
    quantity: 100,
    unitPrice: 120000,
    totalPrice: 12000000,
    vatPercentage: 10,
    notes: "Chất lượng cao",
  },
  {
    id: 2,
    productCode: "SP002",
    productName: "Gạo ST25",
    specification: "Gạo thơm cao cấp",
    unit: "bao",
    quantity: 50,
    unitPrice: 850000,
    totalPrice: 42500000,
    vatPercentage: 5,
  },
  {
    id: 3,
    productCode: "SP003",
    productName: "Dầu ăn Neptune",
    specification: "Chai 1L",
    unit: "chai",
    quantity: 200,
    unitPrice: 45000,
    totalPrice: 9000000,
    vatPercentage: 10,
  },
];

export function QuotationViewModal({
  isOpen,
  onClose,
  quotation,
}: QuotationViewModalProps) {
  if (!quotation) {
    return null;
  }

  // Get mock quote items (will be replaced with actual data)
  const quoteItems = getMockQuoteItems(quotation.quotationId);

  // Calculate totals
  const subtotal = quoteItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalVAT = quoteItems.reduce(
    (sum, item) => sum + (item.totalPrice * item.vatPercentage) / 100,
    0
  );
  const grandTotal = subtotal + totalVAT;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Chi tiết báo giá</span>
            <Badge variant={getStatusVariant(quotation.status)}>
              {getStatusDisplay(quotation.status)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết và danh sách sản phẩm của báo giá
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quotation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin báo giá</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Quotation ID
                  </p>
                  <p className="font-semibold">{quotation.quotationId}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Kỳ báo giá
                  </p>
                  <p className="font-semibold">{formatPeriod(quotation.period)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Nhà cung cấp
                  </p>
                  <p className="font-semibold">
                    {quotation.supplierName || "-"}
                    {quotation.supplierCode && (
                      <span className="text-muted-foreground ml-2">
                        ({quotation.supplierCode})
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Khu vực
                  </p>
                  <p className="font-semibold">{quotation.region}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Nhóm hàng
                  </p>
                  <p className="font-semibold">{quotation.category}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngày báo giá
                  </p>
                  <p className="font-semibold">{formatDate(quotation.quoteDate)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Ngày cập nhật
                  </p>
                  <p className="font-semibold">{formatDate(quotation.updateDate)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Số lượng mặt hàng
                  </p>
                  <p className="font-semibold">{quotation.itemCount} sản phẩm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Quote Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Danh sách sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Mã SP</TableHead>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Quy cách</TableHead>
                      <TableHead className="w-[80px]">Đvt</TableHead>
                      <TableHead className="w-[100px] text-right">Số lượng</TableHead>
                      <TableHead className="w-[120px] text-right">Đơn giá</TableHead>
                      <TableHead className="w-[80px] text-center">VAT (%)</TableHead>
                      <TableHead className="w-[140px] text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.length > 0 ? (
                      quoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.productCode}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.specification}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity.toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitPrice.toLocaleString("vi-VN")} ₫
                          </TableCell>
                          <TableCell className="text-center">
                            {item.vatPercentage}%
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.totalPrice.toLocaleString("vi-VN")} ₫
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          Không có dữ liệu sản phẩm
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              {quoteItems.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tạm tính:</span>
                        <span className="font-medium">
                          {subtotal.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tổng VAT:</span>
                        <span className="font-medium">
                          {totalVAT.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Tổng cộng:</span>
                        <span className="font-bold text-primary">
                          {grandTotal.toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}