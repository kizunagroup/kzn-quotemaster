import { z } from 'zod';
import { User, Team } from '@/lib/db/schema';

// Core QuoteMaster interface types
export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  taxId?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  // Derived data (computed at runtime)
  regions?: string[];
  kitchens?: number[];
  categories?: string[];
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  specification?: string;
  unit: string;
  category: string;
  basePrice?: number;
  baseQuantity?: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Quotation {
  id: number;
  quotationId: string;
  period: string; // YYYY-MM-XX format
  supplierId: number;
  region: string;
  category: string;
  quoteDate?: Date;
  updateDate?: Date;
  status: 'pending' | 'approved' | 'cancelled' | 'negotiation';
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  supplier?: Supplier;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: number;
  quotationId: number;
  productId: number;
  quantity?: number;
  initialPrice?: number;
  negotiatedPrice?: number;
  approvedPrice?: number;
  vatPercentage: number;
  currency: string;
  pricePerUnit?: number;
  negotiationRounds: number;
  lastNegotiatedAt?: Date;
  approvedAt?: Date;
  approvedBy?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  product?: Product;
  quotation?: Quotation;
}

export interface PriceHistory {
  id: number;
  productId: number;
  supplierId: number;
  period: string;
  price: number;
  priceType: 'initial' | 'negotiated' | 'approved';
  region?: string;
  recordedAt: Date;
  // Relations
  product?: Product;
  supplier?: Supplier;
}

export interface KitchenPeriodDemand {
  id: number;
  teamId: number;
  productId: number;
  period: string;
  quantity: number;
  unit: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  team?: ExtendedTeam;
  product?: Product;
}

// Extended template types
export interface ExtendedUser extends User {
  employeeCode?: string;
  phone?: string;
}

export interface ExtendedTeam extends Team {
  kitchenCode?: string;
  region?: string;
  address?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  teamType: 'KITCHEN' | 'OFFICE';
}

// Enhanced team member with QuoteMaster role
export interface ExtendedTeamMember {
  id: number;
  userId: number;
  teamId: number;
  role: string; // Enhanced to support "DEPARTMENT_LEVEL" format
  joinedAt: Date;
  // Relations
  user?: ExtendedUser;
  team?: ExtendedTeam;
}

// Form validation schemas (Zod)
export const supplierFormSchema = z.object({
  supplierCode: z.string().min(1, "Mã nhà cung cấp là bắt buộc"),
  name: z.string().min(1, "Tên nhà cung cấp là bắt buộc"),
  taxId: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
});

export const productFormSchema = z.object({
  productCode: z.string().min(1, "Mã sản phẩm là bắt buộc"),
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  specification: z.string().optional(),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  category: z.string().min(1, "Nhóm hàng là bắt buộc"),
  basePrice: z.number().min(0, "Giá cơ sở không được âm").optional(),
  baseQuantity: z.number().min(0, "Số lượng cơ sở không được âm").optional(),
});

export const kitchenFormSchema = z.object({
  name: z.string().min(1, "Tên bếp là bắt buộc"),
  kitchenCode: z.string().min(1, "Mã bếp là bắt buộc"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  address: z.string().optional(),
  managerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
});

// Enhanced Kitchen schemas for actions
export const createKitchenSchema = z.object({
  kitchenCode: z
    .string()
    .min(1, "Mã bếp là bắt buộc")
    .max(50, "Mã bếp không được quá 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã bếp chỉ được chứa chữ hoa, số, gạch ngang và gạch dưới"),
  name: z
    .string()
    .min(1, "Tên bếp là bắt buộc")
    .max(100, "Tên bếp không được quá 100 ký tự"),
  region: z
    .string()
    .min(1, "Khu vực là bắt buộc")
    .max(50, "Khu vực không được quá 50 ký tự"),
  address: z
    .string()
    .min(1, "Địa chỉ là bắt buộc"),
  managerName: z
    .string()
    .min(1, "Tên quản lý là bắt buộc")
    .max(100, "Tên quản lý không được quá 100 ký tự"),
  phone: z
    .string()
    .min(1, "Số điện thoại là bắt buộc")
    .max(20, "Số điện thoại không được quá 20 ký tự")
    .regex(/^[0-9\s\-\+\(\)]+$/, "Số điện thoại không hợp lệ"),
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(255, "Email không được quá 255 ký tự"),
});

export const updateKitchenSchema = createKitchenSchema.extend({
  id: z.coerce.number().min(1, "ID không hợp lệ"),
});

export const quotationFormSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng kỳ báo giá không hợp lệ (YYYY-MM-XX)"),
  supplierId: z.number().min(1, "Vui lòng chọn nhà cung cấp"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  category: z.string().min(1, "Nhóm hàng là bắt buộc"),
  quoteDate: z.date().optional(),
  updateDate: z.date().optional(),
});

export const quoteItemFormSchema = z.object({
  quotationId: z.number().min(1),
  productId: z.number().min(1, "Vui lòng chọn sản phẩm"),
  quantity: z.number().min(0.01, "Số lượng phải lớn hơn 0").optional(),
  initialPrice: z.number().min(0, "Giá không được âm").optional(),
  negotiatedPrice: z.number().min(0, "Giá không được âm").optional(),
  approvedPrice: z.number().min(0, "Giá không được âm").optional(),
  vatPercentage: z.number().min(0).max(100, "VAT không được vượt quá 100%").default(0),
  currency: z.string().default("VND"),
  notes: z.string().optional(),
});

export const kitchenDemandFormSchema = z.object({
  teamId: z.number().min(1, "Vui lòng chọn bếp"),
  productId: z.number().min(1, "Vui lòng chọn sản phẩm"),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng kỳ không hợp lệ (YYYY-MM-XX)"),
  quantity: z.number().min(0.01, "Số lượng phải lớn hơn 0"),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  notes: z.string().optional(),
});

// Form data types (inferred from Zod schemas)
export type SupplierFormData = z.infer<typeof supplierFormSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type KitchenFormData = z.infer<typeof kitchenFormSchema>;
export type CreateKitchenInput = z.infer<typeof createKitchenSchema>;
export type UpdateKitchenInput = z.infer<typeof updateKitchenSchema>;
export type QuotationFormData = z.infer<typeof quotationFormSchema>;
export type QuoteItemFormData = z.infer<typeof quoteItemFormSchema>;
export type KitchenDemandFormData = z.infer<typeof kitchenDemandFormSchema>;

// API response utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadResponse {
  success: boolean;
  processed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// Dashboard analytics types
export interface DashboardMetrics {
  totalKitchens: number;
  totalProducts: number;
  totalSuppliers: number;
  totalQuotes: number;
  priceIncreaseProducts: ProductTrend[];
  priceDecreaseProducts: ProductTrend[];
  userPermissions: RolePermissions;
}

export interface ProductTrend {
  productId: number;
  productCode: string;
  productName: string;
  category: string;
  currentPrice: number;
  previousPrice: number;
  changePercentage: number;
  changeAmount: number;
  supplierId: number;
  supplierName: string;
}

// Price comparison types
export interface ComparisonOverview {
  period: string;
  regions: string[];
  categories: string[];
  suppliers: string[];
  totalProducts: number;
  bestPriceProducts: number;
  negotiationNeeded: number;
}

export interface ProductComparison {
  productId: number;
  productCode: string;
  productName: string;
  specification: string;
  unit: string;
  category: string;
  region: string;
  quantity: number;
  quantitySource: 'demand' | 'base'; // Indicates if from kitchen_period_demands or products.base_quantity
  basePrice?: number;
  bestPricePreviousPeriod?: number;
  bestPriceCurrentPeriod?: number;
  suppliers: SupplierQuote[];
}

export interface SupplierQuote {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  initialPrice?: number;
  negotiatedPrice?: number;
  approvedPrice?: number;
  totalAmount: number;
  isBestPrice: boolean;
  vatPercentage: number;
  currency: string;
  notes?: string;
}

// Permission and role types
export interface RolePermissions {
  canViewQuotes: boolean;
  canCreateQuotes: boolean;
  canApproveQuotes: boolean;
  canNegotiateQuotes: boolean;
  canManageProducts: boolean;
  canManageSuppliers: boolean;
  canManageKitchens: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  teamRestricted: boolean;
  accessibleTeams: number[];
}

export interface UserPermissions extends RolePermissions {
  userId: number;
  roles: Array<{
    teamId: number;
    teamName: string;
    role: string;
  }>;
}

// Excel processing types
export interface ExcelProcessingResult {
  fileName: string;
  status: 'success' | 'error' | 'warning';
  rowsProcessed: number;
  rowsSuccessful: number;
  rowsWithErrors: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    value: string;
    warning: string;
  }>;
}

export interface QuoteUploadData {
  period: string;
  region: string;
  uploadType: 'initial' | 'update';
  files: File[];
}

// Filter and search types
export interface QuoteFilters {
  period?: string;
  supplier?: string;
  region?: string;
  status?: 'pending' | 'approved' | 'cancelled' | 'negotiation';
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: 'active' | 'inactive';
  supplierId?: number;
}

export interface SupplierFilters {
  search?: string;
  region?: string;
  category?: string;
  status?: 'active' | 'inactive';
}

export interface KitchenFilters {
  search?: string;
  region?: string;
  teamType?: 'KITCHEN' | 'OFFICE';
  status?: 'active' | 'inactive';
}

// Export types
export interface ExportOptions {
  format: 'excel' | 'csv';
  includeHeaders: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  filters?: Record<string, any>;
}

export interface PriceListExportOptions extends ExportOptions {
  period: string;
  region: string;
  groupByCategory: boolean;
  highlightBestPrices: boolean;
}

export interface ComparisonExportOptions extends ExportOptions {
  period: string;
  regions?: string[];
  categories?: string[];
  includeNegotiationData: boolean;
}

// Audit and activity types
export interface QuoteMasterActivity {
  id: string;
  userId: number;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  details?: Record<string, any>;
  // Relations
  user?: ExtendedUser;
}

// Notification types
export interface NotificationData {
  type: 'quote_uploaded' | 'quote_approved' | 'negotiation_needed' | 'price_alert';
  title: string;
  message: string;
  data?: Record<string, any>;
  recipients: number[]; // User IDs
}

// Statistics and reporting types
export interface PeriodStatistics {
  period: string;
  totalQuotes: number;
  approvedQuotes: number;
  pendingQuotes: number;
  totalValue: number;
  averageDiscount: number;
  topSuppliers: Array<{
    supplierId: number;
    supplierName: string;
    quoteCount: number;
    totalValue: number;
  }>;
  topCategories: Array<{
    category: string;
    quoteCount: number;
    totalValue: number;
  }>;
}

// System configuration types
export interface QuoteMasterConfig {
  defaultCurrency: string;
  defaultVatPercentage: number;
  periodFormats: string[];
  maxFileSize: number; // in bytes
  supportedFileTypes: string[];
  priceComparisonThreshold: number; // percentage
  autoApprovalThreshold: number; // amount
}