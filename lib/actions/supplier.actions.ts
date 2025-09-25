'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { suppliers } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';

// Return type for server actions
type ActionResult = {
  success?: string;
  error?: string;
};

// Validation schemas following the implementation plan
const createSupplierSchema = z.object({
  supplierCode: z
    .string()
    .min(1, 'Mã nhà cung cấp là bắt buộc')
    .max(20, 'Mã nhà cung cấp không được vượt quá 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/, 'Mã nhà cung cấp chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới'),
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

const updateSupplierSchema = createSupplierSchema.extend({
  id: z.number().min(1, 'ID nhà cung cấp không hợp lệ'),
});

// Helper function to check supplier code uniqueness
async function isSupplierCodeUnique(supplierCode: string, excludeId?: number): Promise<boolean> {
  const trimmedCode = supplierCode.trim().toUpperCase();

  const conditions = [
    ilike(suppliers.supplierCode, trimmedCode),
    isNull(suppliers.deletedAt), // Only check active suppliers
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${suppliers.id} != ${excludeId}`);
  }

  const existingSupplier = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(...conditions))
    .limit(1);

  return existingSupplier.length === 0;
}

// Server Action: Create Supplier
export async function createSupplier(values: z.infer<typeof createSupplierSchema>): Promise<ActionResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // Check if user has permission to manage suppliers
    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý nhà cung cấp' };
    }

    // 2. Input Validation
    const validationResult = createSupplierSchema.safeParse(values);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return { error: firstError.message };
    }

    const validatedData = validationResult.data;

    // 3. Business Logic Validation - Check for duplicate supplier code
    if (validatedData.supplierCode) {
      const isUnique = await isSupplierCodeUnique(validatedData.supplierCode);
      if (!isUnique) {
        return { error: 'Mã nhà cung cấp đã tồn tại trong hệ thống' };
      }
    }

    // 4. Database Operation
    const insertData = {
      ...validatedData,
      supplierCode: validatedData.supplierCode?.trim().toUpperCase() || null,
      name: validatedData.name.trim(),
      taxId: validatedData.taxId?.trim() || null,
      address: validatedData.address?.trim() || null,
      contactPerson: validatedData.contactPerson?.trim() || null,
      phone: validatedData.phone?.trim() || null,
      email: validatedData.email?.trim() || null,
    };

    await db.insert(suppliers).values(insertData);

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/nha-cung-cap');

    // 6. Return Success Response
    return { success: 'Nhà cung cấp đã được tạo thành công' };
  } catch (error) {
    console.error('Error creating supplier:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return { error: 'Mã nhà cung cấp hoặc email đã tồn tại trong hệ thống' };
      }
    }

    return { error: 'Có lỗi xảy ra khi tạo nhà cung cấp. Vui lòng thử lại.' };
  }
}

// Server Action: Update Supplier
export async function updateSupplier(values: z.infer<typeof updateSupplierSchema>): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý nhà cung cấp' };
    }

    // 2. Input Validation
    const validationResult = updateSupplierSchema.safeParse(values);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return { error: firstError.message };
    }

    const validatedData = validationResult.data;

    // 3. Check if supplier exists
    const existingSupplier = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, validatedData.id), isNull(suppliers.deletedAt)))
      .limit(1);

    if (existingSupplier.length === 0) {
      return { error: 'Không tìm thấy nhà cung cấp' };
    }

    // 4. Business Logic Validation - Check for duplicate supplier code
    if (validatedData.supplierCode) {
      const isUnique = await isSupplierCodeUnique(validatedData.supplierCode, validatedData.id);
      if (!isUnique) {
        return { error: 'Mã nhà cung cấp đã tồn tại trong hệ thống' };
      }
    }

    // 5. Database Operation
    const updateData = {
      supplierCode: validatedData.supplierCode?.trim().toUpperCase() || null,
      name: validatedData.name.trim(),
      taxId: validatedData.taxId?.trim() || null,
      address: validatedData.address?.trim() || null,
      contactPerson: validatedData.contactPerson?.trim() || null,
      phone: validatedData.phone?.trim() || null,
      email: validatedData.email?.trim() || null,
      updatedAt: new Date(),
    };

    await db
      .update(suppliers)
      .set(updateData)
      .where(eq(suppliers.id, validatedData.id));

    // 6. Cache Revalidation
    revalidatePath('/danh-muc/nha-cung-cap');

    // 7. Return Success Response
    return { success: 'Nhà cung cấp đã được cập nhật thành công' };
  } catch (error) {
    console.error('Error updating supplier:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return { error: 'Mã nhà cung cấp hoặc email đã tồn tại trong hệ thống' };
      }
    }

    return { error: 'Có lỗi xảy ra khi cập nhật nhà cung cấp. Vui lòng thử lại.' };
  }
}

// Server Action: Toggle Supplier Status
export async function toggleSupplierStatus(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý nhà cung cấp' };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: 'ID nhà cung cấp không hợp lệ' };
    }

    // 3. Check if supplier exists and get current status
    const existingSupplier = await db
      .select({ id: suppliers.id, status: suppliers.status, name: suppliers.name })
      .from(suppliers)
      .where(and(eq(suppliers.id, id), isNull(suppliers.deletedAt)))
      .limit(1);

    if (existingSupplier.length === 0) {
      return { error: 'Không tìm thấy nhà cung cấp' };
    }

    const supplier = existingSupplier[0];
    const newStatus = supplier.status === 'active' ? 'inactive' : 'active';

    // 4. Database Operation
    await db
      .update(suppliers)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id));

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/nha-cung-cap');

    // 6. Return Success Response
    const statusText = newStatus === 'active' ? 'kích hoạt' : 'tạm dừng';
    return { success: `Đã ${statusText} nhà cung cấp "${supplier.name}" thành công` };
  } catch (error) {
    console.error('Error toggling supplier status:', error);
    return { error: 'Có lỗi xảy ra khi thay đổi trạng thái nhà cung cấp. Vui lòng thử lại.' };
  }
}

// Server Action: Delete Supplier (Soft Delete)
export async function deleteSupplier(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý nhà cung cấp' };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: 'ID nhà cung cấp không hợp lệ' };
    }

    // 3. Check if supplier exists
    const existingSupplier = await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(and(eq(suppliers.id, id), isNull(suppliers.deletedAt)))
      .limit(1);

    if (existingSupplier.length === 0) {
      return { error: 'Không tìm thấy nhà cung cấp' };
    }

    const supplier = existingSupplier[0];

    // 4. Database Operation (Soft Delete)
    await db
      .update(suppliers)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id));

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/nha-cung-cap');

    // 6. Return Success Response
    return { success: `Đã xóa nhà cung cấp "${supplier.name}" thành công` };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { error: 'Có lỗi xảy ra khi xóa nhà cung cấp. Vui lòng thử lại.' };
  }
}

// Export schemas for use in components
export { createSupplierSchema, updateSupplierSchema };
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;