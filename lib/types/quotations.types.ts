import { z } from "zod";
import { type Quotation, type QuoteItem, type Supplier, type Product } from "@/lib/db/schema";

// ==================== VALIDATION SCHEMAS ====================

// Quotation filtering schema
export const QuotationFiltersSchema = z.object({
  period: z.string().optional(),
  region: z.string().optional(),
  supplierId: z.number().optional(),
  status: z.enum(['pending', 'negotiation', 'approved', 'cancelled', 'all']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

// Excel import schema
export const ImportQuotationsSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kỳ báo giá phải có định dạng YYYY-MM-DD"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  overwrite: z.boolean().default(false),
});

// Quotation status update schema
export const UpdateQuotationStatusSchema = z.object({
  id: z.number().positive("ID báo giá không hợp lệ"),
  status: z.enum(['pending', 'negotiation', 'approved', 'cancelled'], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" })
  }),
});

// ==================== TYPES ====================

export interface QuotationWithDetails extends Quotation {
  supplier: Supplier;
  creator: { id: number; name: string; email: string };
  itemCount: number;
}

export interface QuotationDetailsWithItems extends Quotation {
  supplier: Supplier;
  creator: { id: number; name: string; email: string };
  items: Array<QuoteItem & { product: Product }>;
}

export interface ImportResult {
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  totalQuotations: number;
  createdQuotations: number;
  updatedQuotations: number;
  totalItems: number;
  errors: string[];
  warnings: string[];
}