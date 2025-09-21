'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { teams, users } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import {
  createKitchenSchema,
  updateKitchenSchema,
  deleteKitchenSchema,
  type CreateKitchenInput,
  type UpdateKitchenInput,
  type DeleteKitchenInput,
} from '@/lib/schemas/kitchen.schemas';


// Helper function to check kitchen code uniqueness
async function isKitchenCodeUnique(kitchenCode: string, excludeId?: number): Promise<boolean> {
  const trimmedCode = kitchenCode.trim().toUpperCase();

  const conditions = [
    eq(teams.teamType, 'KITCHEN'),
    ilike(teams.kitchenCode, trimmedCode),
    isNull(teams.deletedAt), // Only check active kitchens
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${teams.id} != ${excludeId}`);
  }

  const existingKitchen = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(...conditions))
    .limit(1);

  return existingKitchen.length === 0;
}

// Helper function to validate manager exists and has appropriate permissions
async function validateManager(managerId: number): Promise<{ valid: boolean; error?: string; manager?: any }> {
  try {
    const manager = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);

    if (manager.length === 0) {
      return { valid: false, error: 'Không tìm thấy quản lý được chỉ định' };
    }

    const managerData = manager[0];

    if (managerData.deletedAt) {
      return { valid: false, error: 'Quản lý được chỉ định đã bị vô hiệu hóa' };
    }

    // Check if user has manager-level permissions (consistent with getKitchenManagers)
    const allowedRoles = ['admin', 'manager', 'super_admin', 'admin_super_admin', 'procurement_manager', 'kitchen_manager'];
    if (!allowedRoles.includes(managerData.role.toLowerCase())) {
      return {
        valid: false,
        error: 'Người dùng được chỉ định không có quyền quản lý bếp'
      };
    }

    return { valid: true, manager: managerData };
  } catch (error) {
    console.error('Manager validation error:', error);
    return { valid: false, error: 'Lỗi khi kiểm tra thông tin quản lý' };
  }
}

// Server action to get eligible kitchen managers (Task 2.1.3)
export async function getKitchenManagers(): Promise<{ id: number; name: string; email: string; role: string; }[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Query users table for eligible managers
    const managers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt), // Only active users
          // Filter for users with manager-level permissions
          sql`LOWER(${users.role}) IN ('admin', 'manager', 'super_admin', 'admin_super_admin', 'procurement_manager', 'kitchen_manager')`
        )
      )
      .orderBy(users.name); // Sort alphabetically for better UX

    // 3. Return formatted data suitable for combobox
    return managers.map(manager => ({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role,
    }));

  } catch (error) {
    console.error('Get kitchen managers error:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách quản lý. Vui lòng thử lại.' };
  }
}

// Server action to create a new kitchen (UPDATED FOR NORMALIZED MANAGER)
export async function createKitchen(data: CreateKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Validate input data
    const validationResult = createKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 3. Validate manager exists and has permissions
    const managerValidation = await validateManager(validatedData.managerId);
    if (!managerValidation.valid) {
      return { error: managerValidation.error };
    }

    // 4. Check kitchen code uniqueness
    const isUnique = await isKitchenCodeUnique(validatedData.kitchenCode);
    if (!isUnique) {
      return { error: 'Mã bếp đã tồn tại. Vui lòng chọn mã khác.' };
    }

    // 5. Create kitchen record with normalized manager relationship
    const newKitchen = await db
      .insert(teams)
      .values({
        kitchenCode: validatedData.kitchenCode.trim().toUpperCase(),
        name: validatedData.name.trim(),
        region: validatedData.region.trim(),
        address: validatedData.address?.trim() || null,
        managerId: validatedData.managerId, // NORMALIZED: Reference to users table
        teamType: 'KITCHEN',
        status: validatedData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId
      });

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');

    const managerName = managerValidation.manager?.name || 'Không xác định';
    return {
      success: `Bếp "${newKitchen[0].name}" (${newKitchen[0].kitchenCode}) đã được tạo thành công với quản lý: ${managerName}`
    };

  } catch (error) {
    console.error('Create kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi tạo bếp. Vui lòng thử lại.' };
  }
}

// Server action to update an existing kitchen (Task 2.1.2)
export async function updateKitchen(data: UpdateKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Validate input data
    const validationResult = updateKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 3. Fetch existing kitchen to ensure it exists
    const existingKitchen = await db
      .select({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        region: teams.region,
        address: teams.address,
        managerId: teams.managerId,
        status: teams.status,
        deletedAt: teams.deletedAt
      })
      .from(teams)
      .where(
        and(
          eq(teams.id, validatedData.id),
          eq(teams.teamType, 'KITCHEN')
        )
      )
      .limit(1);

    if (existingKitchen.length === 0) {
      return { error: 'Không tìm thấy bếp cần cập nhật' };
    }

    const currentKitchen = existingKitchen[0];

    if (currentKitchen.deletedAt) {
      return { error: 'Không thể cập nhật bếp đã bị xóa' };
    }

    // 4. Check kitchen code uniqueness if being changed
    if (validatedData.kitchenCode && validatedData.kitchenCode !== currentKitchen.kitchenCode) {
      const isUnique = await isKitchenCodeUnique(validatedData.kitchenCode, validatedData.id);
      if (!isUnique) {
        return { error: 'Mã bếp đã tồn tại. Vui lòng chọn mã khác.' };
      }
    }

    // 5. Validate new manager if managerId is being changed
    if (validatedData.managerId && validatedData.managerId !== currentKitchen.managerId) {
      const managerValidation = await validateManager(validatedData.managerId);
      if (!managerValidation.valid) {
        return { error: managerValidation.error };
      }
    }

    // 6. Build update data with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that were provided
    if (validatedData.kitchenCode !== undefined) {
      updateData.kitchenCode = validatedData.kitchenCode.trim().toUpperCase();
    }
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.region !== undefined) {
      updateData.region = validatedData.region.trim();
    }
    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address?.trim() || null;
    }
    if (validatedData.managerId !== undefined) {
      updateData.managerId = validatedData.managerId;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    // 7. Execute update command
    const updatedKitchen = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, validatedData.id))
      .returning({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId
      });

    // 8. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');

    return {
      success: `Bếp "${updatedKitchen[0].name}" (${updatedKitchen[0].kitchenCode}) đã được cập nhật thành công`
    };

  } catch (error) {
    console.error('Update kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi cập nhật bếp. Vui lòng thử lại.' };
  }
}

// Server action to soft delete a kitchen (Task 2.1.4)
export async function deleteKitchen(data: DeleteKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Validate input data
    const validationResult = deleteKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 3. Check if kitchen exists and is not already deleted
    const existingKitchen = await db
      .select({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId,
        deletedAt: teams.deletedAt
      })
      .from(teams)
      .where(
        and(
          eq(teams.id, validatedData.id),
          eq(teams.teamType, 'KITCHEN')
        )
      )
      .limit(1);

    if (existingKitchen.length === 0) {
      return { error: 'Không tìm thấy bếp cần xóa' };
    }

    if (existingKitchen[0].deletedAt) {
      return { error: 'Bếp này đã được xóa trước đó' };
    }

    // 4. Perform soft delete by setting deletedAt timestamp
    // Note: managerId is preserved for audit trail
    const deletedKitchen = await db
      .update(teams)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id))
      .returning({
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId
      });

    // 5. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');

    return {
      success: `Bếp "${deletedKitchen[0].name}" (${deletedKitchen[0].kitchenCode}) đã được xóa thành công`
    };

  } catch (error) {
    console.error('Delete kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi xóa bếp. Vui lòng thử lại.' };
  }
}

