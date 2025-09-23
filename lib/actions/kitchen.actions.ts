'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { teams, users, teamMembers } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
import { getUser, getUserWithTeams } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';
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
    // BUSINESS RULE: Kitchen codes must be unique forever, regardless of status
    // Do not filter by deletedAt or status - check ALL kitchens
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

// Helper function to validate manager exists (PURE TEAM-BASED RBAC)
async function validateManager(managerId: number): Promise<{ valid: boolean; error?: string; manager?: any }> {
  try {
    const manager = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
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

    if (managerData.status !== 'active') {
      return { valid: false, error: 'Quản lý được chỉ định không ở trạng thái hoạt động' };
    }

    // PURE TEAM-BASED RBAC: Check if user has management permissions via team roles
    const userWithTeams = await getUserWithTeams(managerId);
    let hasManagerPermissions = false;

    if (userWithTeams && userWithTeams.teams && userWithTeams.teams.length > 0) {
      // Check for admin or management roles in any team
      hasManagerPermissions = userWithTeams.teams.some(tm => {
        const role = tm.role.toUpperCase();
        return role.includes('ADMIN_') ||
               role.includes('MANAGER') ||
               role.includes('SUPER_ADMIN');
      });
    }

    if (!hasManagerPermissions) {
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

// Helper function to manage team membership for kitchen managers
async function manageKitchenManagerMembership(
  managerId: number,
  kitchenTeamId: number,
  action: 'create' | 'update',
  previousManagerId?: number
): Promise<void> {
  try {
    // Remove previous manager from team if updating and manager changed
    if (action === 'update' && previousManagerId && previousManagerId !== managerId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, previousManagerId),
            eq(teamMembers.teamId, kitchenTeamId),
            eq(teamMembers.role, 'KITCHEN_MANAGER')
          )
        );
    }

    // Check if new manager is already a member of this team
    const existingMembership = await db
      .select({ id: teamMembers.id, role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, managerId),
          eq(teamMembers.teamId, kitchenTeamId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      // Update existing membership to KITCHEN_MANAGER role
      await db
        .update(teamMembers)
        .set({
          role: 'KITCHEN_MANAGER',
          joinedAt: new Date() // Update join time for role change
        })
        .where(eq(teamMembers.id, existingMembership[0].id));
    } else {
      // Create new team membership with KITCHEN_MANAGER role
      await db
        .insert(teamMembers)
        .values({
          userId: managerId,
          teamId: kitchenTeamId,
          role: 'KITCHEN_MANAGER',
          joinedAt: new Date()
        });
    }
  } catch (error) {
    console.error('Error managing kitchen manager membership:', error);
    throw new Error('Lỗi khi cập nhật quyền quản lý bếp');
  }
}

// Server action to get eligible kitchen managers (PURE TEAM-BASED RBAC)
export async function getKitchenManagers(): Promise<{ id: number; name: string; email: string; currentRole: string; }[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check kitchen management permission
    const canManageKitchens = await checkPermission(user.id, 'canManageKitchens');
    if (!canManageKitchens) {
      return { error: 'Không có quyền quản lý bếp' };
    }

    // 3. Get all active users
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          isNull(users.deletedAt)
        )
      );

    // 4. Filter users who have management permissions via team roles
    const eligibleManagers = [];

    for (const user of allUsers) {
      const userWithTeams = await getUserWithTeams(user.id);
      let hasManagerPermissions = false;
      let currentRole = 'No Role';

      if (userWithTeams && userWithTeams.teams && userWithTeams.teams.length > 0) {
        // Check for admin or management roles in any team
        const managerTeam = userWithTeams.teams.find(tm => {
          const role = tm.role.toUpperCase();
          return role.includes('ADMIN_') ||
                 role.includes('MANAGER') ||
                 role.includes('SUPER_ADMIN');
        });

        if (managerTeam) {
          hasManagerPermissions = true;
          currentRole = managerTeam.role;
        }
      }

      if (hasManagerPermissions) {
        eligibleManagers.push({
          id: user.id,
          name: user.name,
          email: user.email,
          currentRole: currentRole
        });
      }
    }

    return eligibleManagers;
  } catch (error) {
    console.error('Get kitchen managers error:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách quản lý' };
  }
}

// Server action to get regions for kitchen creation/filtering
export async function getRegions(): Promise<string[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Query distinct regions from existing kitchens
    const regions = await db
      .selectDistinct({ region: teams.region })
      .from(teams)
      .where(
        and(
          eq(teams.teamType, 'KITCHEN'),
          isNull(teams.deletedAt),
          sql`${teams.region} IS NOT NULL AND ${teams.region} != ''`
        )
      )
      .orderBy(teams.region);

    return regions.map(r => r.region).filter(Boolean);
  } catch (error) {
    console.error('Get regions error:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách khu vực' };
  }
}

// Server action to create a new kitchen (ENHANCED with team member management)
export async function createKitchen(data: CreateKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check kitchen management permission
    const canManageKitchens = await checkPermission(user.id, 'canManageKitchens');
    if (!canManageKitchens) {
      return { error: 'Không có quyền tạo bếp mới' };
    }

    // 3. Validate input data
    const validationResult = createKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Validate manager exists and has permissions
    const managerValidation = await validateManager(validatedData.managerId);
    if (!managerValidation.valid) {
      return { error: managerValidation.error };
    }

    // 5. Check kitchen code uniqueness
    const isUnique = await isKitchenCodeUnique(validatedData.kitchenCode);
    if (!isUnique) {
      return { error: 'Mã bếp đã tồn tại. Vui lòng chọn mã khác.' };
    }

    // 6. Create kitchen record with normalized manager relationship
    const newKitchen = await db
      .insert(teams)
      .values({
        kitchenCode: validatedData.kitchenCode.trim().toUpperCase(),
        name: validatedData.name.trim(),
        region: validatedData.region.trim(),
        address: validatedData.address?.trim() || null,
        managerId: validatedData.managerId, // NORMALIZED: Reference to users table
        teamType: 'KITCHEN',
        status: 'active', // Default status for new kitchens
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId
      });

    const kitchen = newKitchen[0];

    // 7. ENHANCED: Automatically create team membership for manager
    await manageKitchenManagerMembership(
      validatedData.managerId,
      kitchen.id,
      'create'
    );

    // 8. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');
    return {
      success: `Bếp "${kitchen.name}" (${kitchen.kitchenCode}) đã được tạo thành công và quản lý đã được phân quyền`
    };

  } catch (error) {
    console.error('Create kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi tạo bếp. Vui lòng thử lại.' };
  }
}

// Server action to update an existing kitchen (ENHANCED with team member management)
export async function updateKitchen(data: UpdateKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check kitchen management permission
    const canManageKitchens = await checkPermission(user.id, 'canManageKitchens');
    if (!canManageKitchens) {
      return { error: 'Không có quyền cập nhật bếp' };
    }

    // 3. Validate input data
    const validationResult = updateKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing kitchen to ensure it exists
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

    // 5. Check kitchen code uniqueness if being changed
    if (validatedData.kitchenCode && validatedData.kitchenCode !== currentKitchen.kitchenCode) {
      const isUnique = await isKitchenCodeUnique(validatedData.kitchenCode, validatedData.id);
      if (!isUnique) {
        return { error: 'Mã bếp đã tồn tại. Vui lòng chọn mã khác.' };
      }
    }

    // 6. Validate new manager if being changed
    if (validatedData.managerId && validatedData.managerId !== currentKitchen.managerId) {
      const managerValidation = await validateManager(validatedData.managerId);
      if (!managerValidation.valid) {
        return { error: managerValidation.error };
      }
    }

    // 7. Update kitchen record
    const updatedKitchen = await db
      .update(teams)
      .set({
        kitchenCode: validatedData.kitchenCode?.trim().toUpperCase() || currentKitchen.kitchenCode,
        name: validatedData.name?.trim() || currentKitchen.name,
        region: validatedData.region?.trim() || currentKitchen.region,
        address: validatedData.address?.trim() || currentKitchen.address,
        managerId: validatedData.managerId || currentKitchen.managerId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id))
      .returning({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        managerId: teams.managerId
      });

    const kitchen = updatedKitchen[0];

    // 8. ENHANCED: Update team membership if manager changed
    if (validatedData.managerId && validatedData.managerId !== currentKitchen.managerId) {
      await manageKitchenManagerMembership(
        validatedData.managerId,
        kitchen.id,
        'update',
        currentKitchen.managerId || undefined
      );
    }

    // 9. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');
    return {
      success: `Bếp "${kitchen.name}" (${kitchen.kitchenCode}) đã được cập nhật thành công${validatedData.managerId !== currentKitchen.managerId ? ' và quyền quản lý đã được cập nhật' : ''}`
    };

  } catch (error) {
    console.error('Update kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi cập nhật bếp. Vui lòng thử lại.' };
  }
}

// Server action to deactivate a kitchen
export async function deactivateKitchen(data: DeleteKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check kitchen management permission
    const canManageKitchens = await checkPermission(user.id, 'canManageKitchens');
    if (!canManageKitchens) {
      return { error: 'Không có quyền tạm dừng bếp' };
    }

    // 3. Validate input data
    const validationResult = deleteKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing kitchen
    const existingKitchen = await db
      .select({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
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
      return { error: 'Không tìm thấy bếp cần tạm dừng' };
    }

    const kitchen = existingKitchen[0];

    if (kitchen.deletedAt) {
      return { error: 'Bếp đã được tạm dừng trước đó' };
    }

    if (kitchen.status === 'inactive') {
      return { error: 'Bếp đã ở trạng thái tạm dừng' };
    }

    // 5. Deactivate kitchen (soft delete)
    await db
      .update(teams)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id));

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');
    return {
      success: `Bếp "${kitchen.name}" (${kitchen.kitchenCode}) đã được tạm dừng hoạt động`
    };

  } catch (error) {
    console.error('Deactivate kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi tạm dừng bếp. Vui lòng thử lại.' };
  }
}

// Server action to activate a kitchen
export async function activateKitchen(data: DeleteKitchenInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check kitchen management permission
    const canManageKitchens = await checkPermission(user.id, 'canManageKitchens');
    if (!canManageKitchens) {
      return { error: 'Không có quyền kích hoạt bếp' };
    }

    // 3. Validate input data
    const validationResult = deleteKitchenSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing kitchen
    const existingKitchen = await db
      .select({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
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
      return { error: 'Không tìm thấy bếp cần kích hoạt' };
    }

    const kitchen = existingKitchen[0];

    if (kitchen.status === 'active') {
      return { error: 'Bếp đã đang hoạt động' };
    }

    if (kitchen.deletedAt) {
      return { error: 'Không thể kích hoạt bếp đã bị xóa vĩnh viễn' };
    }

    // 5. Activate kitchen
    await db
      .update(teams)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id));

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/bep');
    return {
      success: `Bếp "${kitchen.name}" (${kitchen.kitchenCode}) đã được kích hoạt thành công`
    };

  } catch (error) {
    console.error('Activate kitchen error:', error);
    return { error: 'Có lỗi xảy ra khi kích hoạt bếp. Vui lòng thử lại.' };
  }
}