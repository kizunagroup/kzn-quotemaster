import { z } from "zod";

// ==================== VALIDATION SCHEMAS ====================

// Price list request schemas
export const GetAvailablePeriodsSchema = z.object({
  teamId: z.number().positive("ID đội/bếp không hợp lệ"),
});

export const GetPriceListMatrixSchema = z.object({
  teamId: z.number().positive("ID đội/bếp không hợp lệ"),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kỳ báo giá phải có định dạng YYYY-MM-XX"),
});

// ==================== TYPES ====================

export interface PeriodInfo {
  period: string;
  approvedQuotations: number;
  availableSuppliers: number;
  totalProducts: number;
  lastUpdated: Date;
}

export interface PriceListMatrixData {
  products: Array<{
    productId: number;
    productCode: string;
    productName: string;
    specification?: string;
    unit: string;
    category: string;
    suppliers: Record<number, {
      supplierId: number;
      supplierCode: string;
      supplierName: string;
      approvedPrice: number;
      vatRate: number;
      pricePerUnit: number;
      totalPriceWithVAT: number;
      hasBestPrice: boolean;
      quotationId: number;
      approvedAt?: Date;
    }>;
    bestSupplierId?: number;
    bestPrice?: number;
    availableSuppliers: number;
  }>;
  suppliers: Array<{
    id: number;
    code: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    quotedProducts: number;
    totalProducts: number;
    coveragePercentage: number;
  }>;
  teamId: number;
  teamName: string;
  teamRegion: string;
  period: string;
  lastUpdated: Date;
  summary: {
    totalProducts: number;
    quotedProducts: number;
    missingProducts: number;
    totalSuppliers: number;
    averageCoverage: number;
  };
}
