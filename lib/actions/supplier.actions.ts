'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { suppliers, teams, supplierServiceScopes } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';
import {
  createSupplierSchema,
  updateSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from '@/lib/schemas/supplier.schemas';

// Return type for server actions
type ActionResult = {
  success?: string;
  error?: string;
};

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
export async function createSupplier(values: CreateSupplierInput): Promise<ActionResult> {
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
export async function updateSupplier(values: UpdateSupplierInput): Promise<ActionResult> {
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

// Server Action: Get All Kitchens (teams with type KITCHEN) for Service Scope Assignment
export async function getAllKitchens(): Promise<Array<{ id: number; name: string; region: string | null }>> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      throw new Error('Không có quyền thực hiện thao tác này');
    }

    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      throw new Error('Bạn không có quyền quản lý nhà cung cấp');
    }

    // 2. Fetch all KITCHEN teams
    const kitchens = await db
      .select({
        id: teams.id,
        name: teams.name,
        region: teams.region,
      })
      .from(teams)
      .where(and(eq(teams.teamType, 'KITCHEN'), isNull(teams.deletedAt)))
      .orderBy(teams.region, teams.name);

    return kitchens;
  } catch (error) {
    console.error('Error fetching kitchens:', error);
    throw error;
  }
}

// Server Action: Get Service Scopes for a Supplier
export async function getScopesForSupplier(supplierId: number): Promise<number[]> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      throw new Error('Không có quyền thực hiện thao tác này');
    }

    const hasPermission = await checkPermission(user.id, 'canManageSuppliers');
    if (!hasPermission) {
      throw new Error('Bạn không có quyền quản lý nhà cung cấp');
    }

    // 2. Validation
    if (!supplierId || supplierId <= 0) {
      throw new Error('ID nhà cung cấp không hợp lệ');
    }

    // 3. Fetch service scopes
    const scopes = await db
      .select({ teamId: supplierServiceScopes.teamId })
      .from(supplierServiceScopes)
      .where(eq(supplierServiceScopes.supplierId, supplierId));

    return scopes.map((scope) => scope.teamId);
  } catch (error) {
    console.error('Error fetching supplier scopes:', error);
    throw error;
  }
}

// Server Action: Update Supplier Service Scopes (Delete-then-Insert Pattern)
export async function updateSupplierServiceScopes(
  supplierId: number,
  teamIds: number[]
): Promise<ActionResult> {
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
    if (!supplierId || supplierId <= 0) {
      return { error: 'ID nhà cung cấp không hợp lệ' };
    }

    // 3. Check if supplier exists
    const existingSupplier = await db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
      .limit(1);

    if (existingSupplier.length === 0) {
      return { error: 'Không tìm thấy nhà cung cấp' };
    }

    // 4. Database Operation using Transaction (Delete-then-Insert Pattern)
    await db.transaction(async (tx) => {
      // Delete existing scopes for this supplier
      await tx
        .delete(supplierServiceScopes)
        .where(eq(supplierServiceScopes.supplierId, supplierId));

      // Insert new scopes if any teamIds provided
      if (teamIds.length > 0) {
        const scopeRecords = teamIds.map((teamId) => ({
          supplierId,
          teamId,
          isActive: true,
        }));

        await tx.insert(supplierServiceScopes).values(scopeRecords);
      }
    });

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/nha-cung-cap');

    // 6. Return Success Response
    return { success: `Đã cập nhật phạm vi dịch vụ cho nhà cung cấp "${existingSupplier[0].name}" thành công` };
  } catch (error) {
    console.error('Error updating supplier service scopes:', error);
    return { error: 'Có lỗi xảy ra khi cập nhật phạm vi dịch vụ. Vui lòng thử lại.' };
  }
}