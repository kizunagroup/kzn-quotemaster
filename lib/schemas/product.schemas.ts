import { z } from "zod";

// Base schema for common fields
const baseProductSchema = {
  productCode: z
    .string()
    .min(1, "Mã hàng là bắt buộc")
    .max(50, "Mã hàng không được quá 50 ký tự")
    .regex(/^[A-Z0-9_-]+$/, "Mã hàng chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới"),
  name: z
    .string()
    .min(1, "Tên hàng là bắt buộc")
    .max(200, "Tên hàng không được quá 200 ký tự"),
  specification: z
    .string()
    .max(1000, "Quy cách không được quá 1000 ký tự")
    .optional(),
  unit: z
    .string()
    .min(1, "Đơn vị tính là bắt buộc")
    .max(50, "Đơn vị tính không được quá 50 ký tự"),
  category: z
    .string()
    .min(1, "Nhóm hàng là bắt buộc")
    .max(100, "Nhóm hàng không được quá 100 ký tự"),
  basePrice: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      "Giá cơ sở phải là số không âm"
    ),
  baseQuantity: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      "Số lượng cơ sở phải là số dương"
    ),
  status: z.enum(["active", "inactive"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

// Create schema
export const createProductSchema = z.object({
  ...baseProductSchema,
});

// Update schema
export const updateProductSchema = z.object({
  id: z.number().positive("ID không hợp lệ"),
  ...baseProductSchema,
});

// Query schema for API routes
export const queryProductsSchema = z.object({
  search: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.string().nullable().default("all"),
  sort: z.string().nullable().default("createdAt"),
  order: z.string().nullable().default("desc"),
  page: z.string().nullable().default("1").pipe(z.coerce.number().min(1)),
  limit: z
    .string()
    .nullable()
    .default("10")
    .pipe(z.coerce.number().min(1).max(100)),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type QueryProductsInput = z.infer<typeof queryProductsSchema>;