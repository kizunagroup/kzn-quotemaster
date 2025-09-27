import { z } from 'zod';

// Validation schemas for supplier operations
export const createSupplierSchema = z.object({
  supplierCode: z
    .string()
    .min(1, 'Mã nhà cung cấp là bắt buộc')
    .max(20, 'Mã nhà cung cấp không được vượt quá 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã nhà cung cấp chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới')
    .optional(),
  name: z
    .string()
    .min(1, 'Tên nhà cung cấp là bắt buộc')
    .max(255, 'Tên nhà cung cấp không được vượt quá 255 ký tự'),
  taxId: z
    .string()
    .max(50, 'Mã số thuế không được vượt quá 50 ký tự')
    .optional(),
  address: z.string().optional(),
  contactPerson: z
    .string()
    .max(255, 'Tên người liên hệ không được vượt quá 255 ký tự')
    .optional(),
  phone: z
    .string()
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Số điện thoại không hợp lệ')
    .optional(),
  email: z
    .string()
    .email('Email không hợp lệ')
    .max(255, 'Email không được vượt quá 255 ký tự')
    .optional()
    .or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.extend({
  id: z.number().min(1, 'ID nhà cung cấp không hợp lệ'),
});

// Query schema for supplier filtering (used in API routes) - MISSING CRITICAL SCHEMA
export const supplierQuerySchema = z.object({
  search: z.string().nullable().optional(),
  status: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(['all', 'active', 'inactive'])),
  sort: z.string().nullable().default('createdAt').transform(val =>
    val === null || val === '' ? 'createdAt' : val
  ).pipe(z.enum(['name', 'supplierCode', 'contactPerson', 'phone', 'email', 'status', 'createdAt'])),
  order: z.string().nullable().default('desc').transform(val =>
    val === null || val === '' ? 'desc' : val
  ).pipe(z.enum(['asc', 'desc'])),
  page: z.string().nullable().default('1').transform(val =>
    val === null || val === '' ? '1' : val
  ).pipe(z.coerce.number().min(1)),
  limit: z.string().nullable().default('10').transform(val =>
    val === null || val === '' ? '10' : val
  ).pipe(z.coerce.number().min(1).max(100)),
});

// Type exports for use in components
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;