import { z } from "zod";
import type { ComparisonMatrix } from "@/lib/utils/price-calculation";

// ==================== VALIDATION SCHEMAS ====================

// Comparison matrix request schema
export const ComparisonMatrixSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kỳ báo giá phải có định dạng YYYY-MM-XX"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  category: z.string().min(1, "Nhóm hàng là bắt buộc"),
});

// Batch negotiation schema
export const BatchNegotiationSchema = z.object({
  quotationIds: z.array(z.number().positive()).min(1, "Phải chọn ít nhất một báo giá"),
});

// Single negotiation schema
export const NegotiateQuotationSchema = z.object({
  id: z.number().positive("ID báo giá không hợp lệ"),
});

// Approve quotation schema
export const ApproveQuotationSchema = z.object({
  id: z.number().positive("ID báo giá không hợp lệ"),
  approvedPrices: z.record(
    z.string(),
    z.number().nonnegative("Giá phê duyệt phải >= 0")
  ).optional(),
});

// ==================== TYPES ====================

// Overview KPIs for the comparison page
export interface OverviewKPIs {
  totalCurrentValue: number; // Total value using effective prices (approved > negotiated > initial)
  comparisonVsInitial: {
    difference: number;
    percentage: number;
  };
  comparisonVsPrevious: {
    difference: number;
    percentage: number;
    hasPreviousData: boolean;
  };
  comparisonVsBase: {
    difference: number;
    percentage: number;
    hasBaseData: boolean;
  };
}

export interface ComparisonMatrixData extends ComparisonMatrix {
  lastUpdated: Date;
  overviewKPIs: OverviewKPIs;
  availableSuppliers: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
    totalQuotations: number;
    pendingQuotations: number;
    negotiationQuotations: number;
    approvedQuotations: number;
  }>;
}

export interface NegotiationResult {
  success: string;
  updatedQuotations: number;
  affectedSuppliers: string[];
}

export interface ApprovalResult {
  success: string;
  approvedItems: number;
  totalApprovedValue: number;
  loggedPriceHistory: number;
}