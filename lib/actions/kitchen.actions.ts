"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { teams, teamMembers, activityLogs, ActivityType } from "@/lib/db/schema";
import { getUser, getUserWithTeam } from "@/lib/db/queries";
import type { ActionState } from "@/lib/auth/middleware";

// Zod Validation Schemas
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
  id: z.number().min(1, "ID không hợp lệ"),
});

// Helper function to check admin permissions
async function checkAdminPermissions(): Promise<{ user: any; isAdmin: boolean; teamData?: any }> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in to continue.");
  }

  // Get user's team information to check role
  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam || !userWithTeam.teamId) {
    throw new Error("Unauthorized: User is not a member of any team.");
  }

  // Get the user's role in their team
  const teamMember = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.userId, user.id),
      eq(teamMembers.teamId, userWithTeam.teamId)
    ),
  });

  const isAdmin = teamMember?.role === 'ADMIN_SUPER_ADMIN' || teamMember?.role === 'ADMIN_MANAGER';

  return {
    user,
    isAdmin,
    teamData: userWithTeam
  };
}

// Get all kitchens (teams with team_type = 'KITCHEN')
export async function getKitchens() {
  const { isAdmin } = await checkAdminPermissions();

  if (!isAdmin) {
    throw new Error("Unauthorized: Only administrators can view kitchens.");
  }

  try {
    const kitchens = await db
      .select({
        id: teams.id,
        kitchenCode: teams.kitchenCode,
        name: teams.name,
        region: teams.region,
        address: teams.address,
        managerName: teams.managerName,
        phone: teams.phone,
        email: teams.email,
        teamType: teams.teamType,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .where(eq(teams.teamType, 'KITCHEN'))
      .orderBy(teams.createdAt);

    return kitchens;
  } catch (error) {
    console.error('Error fetching kitchens:', error);
    throw new Error("Failed to fetch kitchens from database.");
  }
}

// Create new kitchen (creates team with kitchen fields)
export async function createKitchen(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { user, isAdmin, teamData } = await checkAdminPermissions();

    if (!isAdmin) {
      return { error: "Unauthorized: Only administrators can create kitchens." };
    }

    // Validate input
    const validatedFields = createKitchenSchema.safeParse(Object.fromEntries(formData));
    if (!validatedFields.success) {
      return { error: validatedFields.error.errors[0].message };
    }

    const { kitchenCode, name, region, address, managerName, phone, email } = validatedFields.data;

    // Check if kitchen code already exists
    const existingKitchen = await db
      .select()
      .from(teams)
      .where(eq(teams.kitchenCode, kitchenCode))
      .limit(1);

    if (existingKitchen.length > 0) {
      return { error: "Mã bếp đã tồn tại. Vui lòng chọn mã khác." };
    }

    // Create new kitchen team
    const [newKitchen] = await db
      .insert(teams)
      .values({
        name,
        kitchenCode,
        region,
        address,
        managerName,
        phone,
        email,
        teamType: 'KITCHEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      teamId: teamData.teamId,
      userId: user.id,
      action: ActivityType.CREATE_KITCHEN,
      timestamp: new Date(),
    });

    // Revalidate the kitchen management page
    revalidatePath('/danh-muc/bep');

    return { success: "Tạo bếp thành công." };
  } catch (error) {
    console.error('Error creating kitchen:', error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Không thể tạo bếp. Vui lòng thử lại." };
  }
}

// Update kitchen (updates team with kitchen fields)
export async function updateKitchen(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { user, isAdmin, teamData } = await checkAdminPermissions();

    if (!isAdmin) {
      return { error: "Unauthorized: Only administrators can update kitchens." };
    }

    // Validate input
    const validatedFields = updateKitchenSchema.safeParse(Object.fromEntries(formData));
    if (!validatedFields.success) {
      return { error: validatedFields.error.errors[0].message };
    }

    const { id, kitchenCode, name, region, address, managerName, phone, email } = validatedFields.data;

    // Check if kitchen exists and is a kitchen team
    const existingKitchen = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.teamType, 'KITCHEN')))
      .limit(1);

    if (existingKitchen.length === 0) {
      return { error: "Bếp không tồn tại hoặc không phải là bếp hợp lệ." };
    }

    // Check if kitchen code is taken by another kitchen
    if (existingKitchen[0].kitchenCode !== kitchenCode) {
      const kitchenCodeExists = await db
        .select()
        .from(teams)
        .where(and(eq(teams.kitchenCode, kitchenCode), eq(teams.id, id)))
        .limit(1);

      if (kitchenCodeExists.length > 0) {
        return { error: "Mã bếp đã được sử dụng bởi bếp khác." };
      }
    }

    // Update kitchen
    await db
      .update(teams)
      .set({
        name,
        kitchenCode,
        region,
        address,
        managerName,
        phone,
        email,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      teamId: teamData.teamId,
      userId: user.id,
      action: ActivityType.UPDATE_KITCHEN,
      timestamp: new Date(),
    });

    // Revalidate the kitchen management page
    revalidatePath('/danh-muc/bep');

    return { success: "Cập nhật bếp thành công." };
  } catch (error) {
    console.error('Error updating kitchen:', error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Không thể cập nhật bếp. Vui lòng thử lại." };
  }
}

// Delete kitchen (soft delete by setting status = 'inactive')
export async function deleteKitchen(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { user, isAdmin, teamData } = await checkAdminPermissions();

    // Only SUPER_ADMIN can delete kitchens
    const teamMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, user.id),
        eq(teamMembers.teamId, teamData.teamId)
      ),
    });

    if (teamMember?.role !== 'ADMIN_SUPER_ADMIN') {
      return { error: "Unauthorized: Only super administrators can delete kitchens." };
    }

    const id = parseInt(formData.get('id') as string);
    if (!id || isNaN(id)) {
      return { error: "ID bếp không hợp lệ." };
    }

    // Check if kitchen exists and is a kitchen team
    const existingKitchen = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, id), eq(teams.teamType, 'KITCHEN')))
      .limit(1);

    if (existingKitchen.length === 0) {
      return { error: "Bếp không tồn tại hoặc không phải là bếp hợp lệ." };
    }

    // Soft delete by updating team type to indicate inactive
    // We'll add a status column check - for now, we can't actually delete because of foreign key constraints
    // This is a placeholder that maintains data integrity

    // TODO: Implement proper soft delete when status column is confirmed in schema
    // For now, we'll just return an error suggesting the kitchen should be archived instead
    return { error: "Không thể xóa bếp do ràng buộc dữ liệu. Vui lòng liên hệ quản trị viên để lưu trữ bếp." };

    /* Future implementation when status column is available:
    await db
      .update(teams)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      teamId: teamData.teamId,
      userId: user.id,
      action: ActivityType.DELETE_KITCHEN,
      timestamp: new Date(),
    });

    revalidatePath('/danh-muc/bep');
    return { success: "Xóa bếp thành công." };
    */
  } catch (error) {
    console.error('Error deleting kitchen:', error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Không thể xóa bếp. Vui lòng thử lại." };
  }
}