import { z } from 'zod';

// Task 2.1.1: Zod Schemas for Staff Management with Vietnamese error messages
export const createStaffSchema = z.object({
  employeeCode: z
    .string()
    .min(1, 'Mã nhân viên là bắt buộc')
    .max(50, 'Mã nhân viên không được vượt quá 50 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã nhân viên chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới')
    .optional(),
  name: z
    .string()
    .min(1, 'Tên nhân viên là bắt buộc')
    .max(100, 'Tên nhân viên không được vượt quá 100 ký tự')
    .trim(),
  email: z
    .string()
    .email('Email không hợp lệ')
    .max(255, 'Email không được vượt quá 255 ký tự')
    .toLowerCase(),
  phone: z
    .string()
    .max(20, 'Số điện thoại không được vượt quá 20 ký tự')
    .optional(),
  jobTitle: z
    .string()
    .max(100, 'Chức danh không được vượt quá 100 ký tự')
    .optional(),
  department: z
    .string()
    .min(1, 'Phòng ban là bắt buộc')
    .max(50, 'Phòng ban không được vượt quá 50 ký tự'),
  hireDate: z
    .string()
    .optional()
    .pipe(z.coerce.date().optional())
    .transform((val) => val ? val.toISOString().split('T')[0] : undefined)
    .catch(undefined), // Gracefully handle invalid dates
});

export const updateStaffSchema = createStaffSchema.extend({
  id: z.number().positive('ID nhân viên không hợp lệ'),
  status: z
    .enum(['active', 'inactive', 'terminated'], {
      errorMap: () => ({ message: 'Trạng thái phải là: active, inactive, hoặc terminated' })
    })
    .optional(),
});

export const deleteStaffSchema = z.object({
  id: z.number().positive('ID nhân viên không hợp lệ'),
});

// Type exports for the schemas
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type DeleteStaffInput = z.infer<typeof deleteStaffSchema>;

// Staff interface with team assignments
export interface Staff {
  id: number;
  employeeCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  hireDate: Date | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Team assignment info (from join)
  currentTeams?: {
    teamId: number;
    teamName: string;
    role: string;
    joinedAt: Date;
  }[];
}

// Action result type
export type ActionResult = {
  success?: string;
  error?: string;
};