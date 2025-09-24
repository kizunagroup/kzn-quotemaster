import { z } from 'zod';

// Team type enum for validation
export const teamTypeEnum = z.enum(['KITCHEN', 'OFFICE'], {
  errorMap: () => ({ message: 'Loại nhóm phải là KITCHEN hoặc OFFICE' })
});

// Base schema for common team fields
const baseTeamSchema = {
  name: z
    .string()
    .min(1, 'Tên nhóm là bắt buộc')
    .max(255, 'Tên nhóm không được quá 255 ký tự'),
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
};

// Validation schemas using discriminatedUnion for team operations
export const createTeamSchema = z.discriminatedUnion('teamType', [
  // KITCHEN team schema - teamCode is required with validation
  z.object({
    teamType: z.literal('KITCHEN'),
    teamCode: z
      .string()
      .min(1, 'Mã nhóm là bắt buộc cho Nhóm Bếp')
      .max(20, 'Mã nhóm không được quá 20 ký tự')
      .regex(/^[A-Z0-9_-]+$/, 'Mã nhóm chỉ được chứa chữ hoa, số, dấu gạch dưới và dấu gạch ngang'),
    ...baseTeamSchema,
  }),
  // OFFICE team schema - teamCode is optional and not validated
  z.object({
    teamType: z.literal('OFFICE'),
    teamCode: z.string().optional(),
    ...baseTeamSchema,
  }),
]);

// Base schema for common update fields (all optional for partial updates)
const baseUpdateTeamSchema = {
  name: z
    .string()
    .min(1, 'Tên nhóm là bắt buộc')
    .max(255, 'Tên nhóm không được quá 255 ký tự')
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
};

export const updateTeamSchema = z.discriminatedUnion('teamType', [
  // KITCHEN team update schema - teamCode validation when provided
  z.object({
    id: z.number().positive('ID nhóm không hợp lệ'),
    teamType: z.literal('KITCHEN'),
    teamCode: z
      .string()
      .min(1, 'Mã nhóm là bắt buộc cho Nhóm Bếp')
      .max(20, 'Mã nhóm không được quá 20 ký tự')
      .regex(/^[A-Z0-9_-]+$/, 'Mã nhóm chỉ được chứa chữ hoa, số, dấu gạch dưới và dấu gạch ngang')
      .optional(),
    ...baseUpdateTeamSchema,
  }),
  // OFFICE team update schema - teamCode optional without validation
  z.object({
    id: z.number().positive('ID nhóm không hợp lệ'),
    teamType: z.literal('OFFICE'),
    teamCode: z.string().optional(),
    ...baseUpdateTeamSchema,
  }),
]);

export const deleteTeamSchema = z.object({
  id: z.number().positive('ID nhóm không hợp lệ'),
});

// Query schema for team filtering (used in API routes)
export const teamQuerySchema = z.object({
  search: z.string().nullable().optional(),
  region: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ),
  status: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(['all', 'active', 'inactive'])),
  // NEW: Team type filter for generic team management
  teamType: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(['all', 'KITCHEN', 'OFFICE'])),
  sort: z.string().nullable().default('name').transform(val =>
    val === null || val === '' ? 'name' : val
  ).pipe(z.enum(['name', 'teamCode', 'region', 'teamType', 'status', 'createdAt'])),
  order: z.string().nullable().default('asc').transform(val =>
    val === null || val === '' ? 'asc' : val
  ).pipe(z.enum(['asc', 'desc'])),
  page: z.string().nullable().default('1').transform(val =>
    val === null || val === '' ? '1' : val
  ).pipe(z.coerce.number().min(1)),
  limit: z.string().nullable().default('10').transform(val =>
    val === null || val === '' ? '10' : val
  ).pipe(z.coerce.number().min(1).max(100)),
});

// Type exports for convenience
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamSchema>;
export type TeamQueryInput = z.infer<typeof teamQuerySchema>;
export type TeamType = z.infer<typeof teamTypeEnum>;

// Team response interface for API consistency
export interface Team {
  id: number;
  teamCode: string | null;
  name: string;
  region: string;
  address?: string;
  managerId?: number;
  managerName?: string;
  managerEmail?: string;
  teamType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface TeamsResponse {
  data: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    region?: string;
    status: string;
    teamType: string;
    sort: string;
    order: string;
  };
}