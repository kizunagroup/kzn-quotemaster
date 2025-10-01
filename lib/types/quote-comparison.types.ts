import { z } from "zod";
import type { ComparisonMatrix } from "@/lib/utils/price-calculation";

// ==================== VALIDATION SCHEMAS ====================

// Comparison matrix request schema
export const ComparisonMatrixSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kỳ báo giá phải có định dạng YYYY-MM-XX"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  categories: z.array(z.string().min(1, "Nhóm hàng không được rỗng")).min(1, "Phải chọn ít nhất một nhóm hàng"),
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

// Supplier Performance - Detailed metrics for one supplier in one category
export interface SupplierPerformance {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  productCount: number; // Number of products this supplier quoted in this category

  // Total values (all using base quantity for consistency)
  totalBaseValue: number; // Sum of (base_quantity * lowest_initial_price)
  totalPreviousValue: number | null; // Sum of (base_quantity * previous_approved_price) - null if no previous data
  totalInitialValue: number; // Sum of (base_quantity * initial_price from this supplier)
  totalCurrentValue: number; // Sum of (base_quantity * current_effective_price from this supplier)

  // Variance calculations
  varianceVsBase: {
    difference: number;
    percentage: number;
  };
  varianceVsPrevious: {
    difference: number;
    percentage: number;
  } | null; // null if no previous data
  varianceVsInitial: {
    difference: number;
    percentage: number;
  };

  // Quotation status for color coding
  quotationStatus: 'pending' | 'negotiation' | 'approved' | null;
}

// Category Overview - All suppliers' performance in one category
export interface CategoryOverview {
  category: string;
  supplierPerformances: SupplierPerformance[];
}

// Region Overview - All categories in one region
export interface RegionOverview {
  region: string;
  categories: CategoryOverview[];
}

// Grouped Overview - Complete hierarchical structure
export interface GroupedOverview {
  regions: RegionOverview[];
}

export interface ComparisonMatrixData extends ComparisonMatrix {
  lastUpdated: Date;
  groupedOverview: GroupedOverview; // New multi-dimensional analytical structure
  availableSuppliers: Array<{
    id: number;
    code: string;
    name: string;
    status: string;
    // NEW: Add quotation-level data
    quotationId: number | null;  // The regional quotation ID for this supplier
    quotationStatus: 'draft' | 'submitted' | 'negotiation' | 'approved' | 'rejected' | null;
    quotationSubmittedAt: Date | null;
    quotationLastUpdated: Date | null;
    // Statistics
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