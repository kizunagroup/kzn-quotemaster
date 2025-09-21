import { z } from 'zod';

// Validation schemas for kitchen operations (NORMALIZED MANAGER APPROACH)
export const createKitchenSchema = z.object({
  kitchenCode: z
    .string()
    .min(1, 'Mã bếp là bắt buộc')
    .max(20, 'Mã bếp không được quá 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã bếp chỉ được chứa chữ hoa, số, dấu gạch dưới và dấu gạch ngang'),
  name: z
    .string()
    .min(1, 'Tên bếp là bắt buộc')
    .max(255, 'Tên bếp không được quá 255 ký tự'),
  region: z
    .string()
    .min(1, 'Khu vực là bắt buộc')
    .max(100, 'Khu vực không được quá 100 ký tự'),
  address: z
    .string()
    .max(500, 'Địa chỉ không được quá 500 ký tự')
    .optional(),
  // Manager relationship (NORMALIZED) - reference to users table
  managerId: z
    .number()
    .positive('ID quản lý không hợp lệ'),
  status: z
    .enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Trạng thái phải là "Hoạt động" hoặc "Tạm dừng"' })
    })
    .default('active'),
});

export const updateKitchenSchema = z.object({
  id: z.number().positive('ID bếp không hợp lệ'),
  kitchenCode: z
    .string()
    .min(1, 'Mã bếp là bắt buộc')
    .max(20, 'Mã bếp không được quá 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã bếp chỉ được chứa chữ hoa, số, dấu gạch dưới và dấu gạch ngang')
    .optional(),
  name: z
    .string()
    .min(1, 'Tên bếp là bắt buộc')
    .max(255, 'Tên bếp không được quá 255 ký tự')
    .optional(),
  region: z
    .string()
    .min(1, 'Khu vực là bắt buộc')
    .max(100, 'Khu vực không được quá 100 ký tự')
    .optional(),
  address: z
    .string()
    .max(500, 'Địa chỉ không được quá 500 ký tự')
    .optional(),
  managerId: z
    .number()
    .positive('ID quản lý không hợp lệ')
    .optional(),
  status: z
    .enum(['active', 'inactive'], {
      errorMap: () => ({ message: 'Trạng thái phải là "Hoạt động" hoặc "Tạm dừng"' })
    })
    .optional(),
});

export const deleteKitchenSchema = z.object({
  id: z.number().positive('ID bếp không hợp lệ'),
});

// Type exports for convenience
export type CreateKitchenInput = z.infer<typeof createKitchenSchema>;
export type UpdateKitchenInput = z.infer<typeof updateKitchenSchema>;
export type DeleteKitchenInput = z.infer<typeof deleteKitchenSchema>;