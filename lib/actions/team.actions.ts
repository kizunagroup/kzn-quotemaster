"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/drizzle";
import { teams, users, teamMembers } from "@/lib/db/schema";
import { eq, and, ilike, isNull, sql, inArray, asc } from "drizzle-orm";
import { getUser, getUserWithTeams } from "@/lib/db/queries";
import { checkPermission } from "@/lib/auth/permissions";
import {
  createTeamSchema,
  updateTeamSchema,
  deleteTeamSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type DeleteTeamInput,
} from "@/lib/schemas/team.schemas";

// Helper function to check team code uniqueness for kitchen teams
async function isTeamCodeUnique(
  teamCode: string,
  teamType: string,
  excludeId?: number
): Promise<boolean> {
  const trimmedCode = teamCode.trim().toUpperCase();

  const conditions = [
    eq(teams.teamType, teamType),
    ilike(teams.teamCode, trimmedCode),
    // BUSINESS RULE: Team codes must be unique forever within team type, regardless of status
    // Do not filter by deletedAt or status - check ALL teams of this type
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${teams.id} != ${excludeId}`);
  }

  const existingTeam = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(...conditions))
    .limit(1);

  return existingTeam.length === 0;
}

// Helper function to validate manager exists (PURE TEAM-BASED RBAC)
async function validateManager(
  managerId: number
): Promise<{ valid: boolean; error?: string; manager?: any }> {
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
      return { valid: false, error: "Không tìm thấy quản lý được chỉ định" };
    }

    const managerData = manager[0];

    if (managerData.deletedAt) {
      return { valid: false, error: "Quản lý được chỉ định đã bị vô hiệu hóa" };
    }

    if (managerData.status !== "active") {
      return {
        valid: false,
        error: "Quản lý được chỉ định không ở trạng thái hoạt động",
      };
    }

    // Management permissions will be assigned when creating the team
    // No need to check for existing permissions here

    return { valid: true, manager: managerData };
  } catch (error) {
    console.error("Manager validation error:", error);
    return { valid: false, error: "Lỗi khi kiểm tra thông tin quản lý" };
  }
}

// Helper function to manage team membership for team managers
async function manageTeamManagerMembership(
  managerId: number,
  teamId: number,
  teamType: string,
  action: "create" | "update",
  previousManagerId?: number
): Promise<void> {
  try {
    console.log(`[manageTeamManagerMembership] Starting for managerId: ${managerId}, teamId: ${teamId}, teamType: ${teamType}, action: ${action}`);

    // Determine role based on team type
    // KITCHEN teams use KITCHEN_MANAGER role
    // OFFICE teams use ADMIN_MANAGER as the default management role for office teams
    const managerRole =
      teamType === "KITCHEN" ? "KITCHEN_MANAGER" : "ADMIN_MANAGER";

    console.log(`[manageTeamManagerMembership] Assigning role: ${managerRole}`);

    // Remove previous manager from team if updating and manager changed
    if (
      action === "update" &&
      previousManagerId &&
      previousManagerId !== managerId
    ) {
      console.log(`[manageTeamManagerMembership] Removing previous manager ${previousManagerId} from team`);
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, previousManagerId),
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.role, managerRole)
          )
        );
      console.log(`[manageTeamManagerMembership] Previous manager removed successfully`);
    }

    // Check if new manager is already a member of this team
    console.log(`[manageTeamManagerMembership] Checking existing membership for user ${managerId}`);
    const existingMembership = await db
      .select({ id: teamMembers.id, role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.userId, managerId), eq(teamMembers.teamId, teamId))
      )
      .limit(1);

    if (existingMembership.length > 0) {
      console.log(`[manageTeamManagerMembership] Updating existing membership to ${managerRole}`);
      // Update existing membership to manager role
      await db
        .update(teamMembers)
        .set({
          role: managerRole,
          joinedAt: new Date(), // Update join time for role change
        })
        .where(eq(teamMembers.id, existingMembership[0].id));
      console.log(`[manageTeamManagerMembership] Membership updated successfully`);
    } else {
      console.log(`[manageTeamManagerMembership] Creating new membership with role ${managerRole}`);
      // Create new team membership with manager role
      await db.insert(teamMembers).values({
        userId: managerId,
        teamId: teamId,
        role: managerRole,
        joinedAt: new Date(),
      });
      console.log(`[manageTeamManagerMembership] Membership created successfully`);
    }

    console.log(`[manageTeamManagerMembership] Completed successfully`);
  } catch (error) {
    console.error("[manageTeamManagerMembership] Error managing team manager membership:", error);
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error("[manageTeamManagerMembership] Error message:", error.message);
      console.error("[manageTeamManagerMembership] Error stack:", error.stack);
    }
    throw new Error("Lỗi khi cập nhật quyền quản lý nhóm");
  }
}

// Server action to get eligible team managers (PHASE 1 OPTIMIZED: search + limit)
export async function getTeamManagers(
  searchQuery?: string
): Promise<
  | {
      id: number;
      name: string;
      email: string;
      department: string | null;
      jobTitle: string | null;
      role: string;
    }[]
  | { error: string }
> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      return { error: "Không có quyền quản lý nhóm" };
    }

    // 3. Build WHERE conditions for optimized query
    const whereConditions = [
      eq(users.status, "active"),
      isNull(users.deletedAt),
    ];

    // 4. Add search filter if provided (leverages the composite index)
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      whereConditions.push(
        sql`(
          ${users.name} ILIKE ${searchTerm} OR 
          ${users.email} ILIKE ${searchTerm} OR
          ${users.employeeCode} ILIKE ${searchTerm} OR
          ${users.department} ILIKE ${searchTerm} OR
          ${users.jobTitle} ILIKE ${searchTerm}
        )`
      );
    }

    // 5. PHASE 1 OPTIMIZATION: Select only necessary fields + LIMIT 50
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        employeeCode: users.employeeCode,
        department: users.department,
        jobTitle: users.jobTitle,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(users.name) // Consistent ordering for better UX
      .limit(50); // PHASE 1: Limit to 50 results for performance

    // 6. Return optimized results with minimal processing
    const eligibleManagers = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      employeeCode: user.employeeCode,
      department: user.department,
      jobTitle: user.jobTitle,
      role: "User", // Generic role since permissions are assigned via team membership
    }));

    return eligibleManagers;
  } catch (error) {
    console.error("Get team managers error:", error);
    return { error: "Có lỗi xảy ra khi tải danh sách quản lý" };
  }
}

// Server action to get regions for team creation/filtering
export async function getRegions(): Promise<string[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // 2. Query distinct regions from existing teams (all types)
    const regions = await db
      .selectDistinct({ region: teams.region })
      .from(teams)
      .where(
        and(
          isNull(teams.deletedAt),
          sql`${teams.region} IS NOT NULL AND ${teams.region} != ''`
        )
      )
      .orderBy(teams.region);

    return regions.map((r) => r.region).filter(Boolean);
  } catch (error) {
    console.error("Get regions error:", error);
    return { error: "Có lỗi xảy ra khi tải danh sách khu vực" };
  }
}

// Server Action: Get Team Types
export async function getTeamTypes(): Promise<string[] | { error: string }> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền truy cập' };
    }

    // Check if user has permission to view teams
    const hasPermission = await checkPermission(user.id, 'canManageKitchens');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền xem danh sách nhóm' };
    }

    // 2. Database Query - Get distinct team types
    const result = await db
      .selectDistinct({
        teamType: teams.teamType
      })
      .from(teams)
      .where(
        and(
          isNull(teams.deletedAt), // Exclude soft-deleted records
          sql`${teams.teamType} IS NOT NULL AND TRIM(${teams.teamType}) != ''` // Exclude null/empty team types
        )
      )
      .orderBy(asc(teams.teamType));

    // 3. Extract and return team type strings
    const teamTypes = result
      .map(row => row.teamType)
      .filter((teamType): teamType is string =>
        teamType !== null && teamType.trim() !== ''
      );

    return teamTypes;
  } catch (error) {
    console.error('Error fetching team types:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách loại hình nhóm' };
  }
}

// Server action to create a new team (ENHANCED with team member management)
export async function createTeam(data: CreateTeamInput) {
  try {
    console.log("[createTeam] Starting team creation with data:", JSON.stringify(data, null, 2));

    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      console.error("[createTeam] Authorization failed: No user found");
      return { error: "Không có quyền thực hiện thao tác này" };
    }
    console.log(`[createTeam] User authenticated: ${user.id}`);

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      console.error("[createTeam] Permission check failed");
      return { error: "Không có quyền tạo nhóm mới" };
    }
    console.log("[createTeam] Permission check passed");

    // 3. Validate input data
    const validationResult = createTeamSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");
      console.error("[createTeam] Validation failed:", errors);
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;
    console.log("[createTeam] Data validated successfully");

    // 4. Validate manager exists and has permissions
    const managerValidation = await validateManager(validatedData.managerId);
    if (!managerValidation.valid) {
      return { error: managerValidation.error };
    }

    // 5. Check team code uniqueness if provided (required for kitchen teams)
    if (validatedData.teamCode && validatedData.teamCode.trim()) {
      const isUnique = await isTeamCodeUnique(
        validatedData.teamCode,
        validatedData.teamType
      );
      if (!isUnique) {
        return { error: "Mã nhóm đã tồn tại. Vui lòng chọn mã khác." };
      }
    }

    // 6. Create team record with normalized manager relationship
    const newTeam = await db
      .insert(teams)
      .values({
        // Handle teamCode properly - null for OFFICE teams, formatted for KITCHEN teams
        teamCode:
          validatedData.teamType === "OFFICE"
            ? null
            : validatedData.teamCode
            ? validatedData.teamCode.trim().toUpperCase()
            : null,
        name: validatedData.name.trim(),
        region: validatedData.region.trim(),
        address: validatedData.address?.trim() || null,
        managerId: validatedData.managerId, // NORMALIZED: Reference to users table
        teamType: validatedData.teamType,
        status: "active", // Default status for new teams
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: teams.id,
        teamCode: teams.teamCode,
        name: teams.name,
        teamType: teams.teamType,
        managerId: teams.managerId,
      });

    const team = newTeam[0];

    // 7. ENHANCED: Automatically create team membership for manager
    console.log("[createTeam] Creating team membership for manager");
    await manageTeamManagerMembership(
      validatedData.managerId,
      team.id,
      validatedData.teamType,
      "create"
    );
    console.log("[createTeam] Team membership created successfully");

    // 8. Revalidate cache and return success
    revalidatePath("/danh-muc/nhom");
    console.log(`[createTeam] Team created successfully: ${team.name} (ID: ${team.id})`);
    return {
      success: `Nhóm "${team.name}" (${
        team.teamCode || "No Code"
      }) đã được tạo thành công và quản lý đã được phân quyền`,
    };
  } catch (error) {
    console.error("[createTeam] FATAL ERROR:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("[createTeam] Error message:", error.message);
      console.error("[createTeam] Error stack:", error.stack);
    }
    return { error: "Có lỗi xảy ra khi tạo nhóm. Vui lòng thử lại." };
  }
}

// Server action to update an existing team (ENHANCED with team member management)
export async function updateTeam(data: UpdateTeamInput) {
  try {
    console.log("[updateTeam] Starting team update with data:", JSON.stringify(data, null, 2));

    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      console.error("[updateTeam] Authorization failed: No user found");
      return { error: "Không có quyền thực hiện thao tác này" };
    }
    console.log(`[updateTeam] User authenticated: ${user.id}`);

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      console.error("[updateTeam] Permission check failed");
      return { error: "Không có quyền cập nhật nhóm" };
    }
    console.log("[updateTeam] Permission check passed");

    // 3. Validate input data
    const validationResult = updateTeamSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing team to ensure it exists
    const existingTeam = await db
      .select({
        id: teams.id,
        teamCode: teams.teamCode,
        name: teams.name,
        region: teams.region,
        address: teams.address,
        managerId: teams.managerId,
        teamType: teams.teamType,
        status: teams.status,
        deletedAt: teams.deletedAt,
      })
      .from(teams)
      .where(eq(teams.id, validatedData.id))
      .limit(1);

    if (existingTeam.length === 0) {
      return { error: "Không tìm thấy nhóm cần cập nhật" };
    }

    const currentTeam = existingTeam[0];

    if (currentTeam.deletedAt) {
      return { error: "Không thể cập nhật nhóm đã bị xóa" };
    }

    // 5. Check team code uniqueness if being changed
    if (
      validatedData.teamCode &&
      validatedData.teamCode.trim() &&
      validatedData.teamCode !== currentTeam.teamCode
    ) {
      const isUnique = await isTeamCodeUnique(
        validatedData.teamCode,
        currentTeam.teamType,
        validatedData.id
      );
      if (!isUnique) {
        return { error: "Mã nhóm đã tồn tại. Vui lòng chọn mã khác." };
      }
    }

    // 6. Validate new manager if being changed
    if (
      validatedData.managerId &&
      validatedData.managerId !== currentTeam.managerId
    ) {
      const managerValidation = await validateManager(validatedData.managerId);
      if (!managerValidation.valid) {
        return { error: managerValidation.error };
      }
    }

    // 7. Update team record
    const updatedTeam = await db
      .update(teams)
      .set({
        // Handle teamCode based on team type - consistent with create logic
        teamCode:
          validatedData.teamCode !== undefined
            ? currentTeam.teamType === "OFFICE"
              ? null
              : validatedData.teamCode && validatedData.teamCode.trim()
              ? validatedData.teamCode.trim().toUpperCase()
              : null
            : currentTeam.teamCode,
        name: validatedData.name?.trim() || currentTeam.name,
        region: validatedData.region?.trim() || currentTeam.region,
        address: validatedData.address?.trim() || currentTeam.address,
        managerId: validatedData.managerId || currentTeam.managerId,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id))
      .returning({
        id: teams.id,
        teamCode: teams.teamCode,
        name: teams.name,
        teamType: teams.teamType,
        managerId: teams.managerId,
      });

    const team = updatedTeam[0];

    // 8. ENHANCED: Update team membership if manager changed
    if (
      validatedData.managerId &&
      validatedData.managerId !== currentTeam.managerId
    ) {
      console.log("[updateTeam] Manager changed, updating team membership");
      await manageTeamManagerMembership(
        validatedData.managerId,
        team.id,
        currentTeam.teamType,
        "update",
        currentTeam.managerId || undefined
      );
      console.log("[updateTeam] Team membership updated successfully");
    }

    // 9. Revalidate cache and return success
    revalidatePath("/danh-muc/nhom");
    console.log(`[updateTeam] Team updated successfully: ${team.name} (ID: ${team.id})`);
    return {
      success: `Nhóm "${team.name}" (${
        team.teamCode || "No Code"
      }) đã được cập nhật thành công${
        validatedData.managerId !== currentTeam.managerId
          ? " và quyền quản lý đã được cập nhật"
          : ""
      }`,
    };
  } catch (error) {
    console.error("[updateTeam] FATAL ERROR:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("[updateTeam] Error message:", error.message);
      console.error("[updateTeam] Error stack:", error.stack);
    }
    return { error: "Có lỗi xảy ra khi cập nhật nhóm. Vui lòng thử lại." };
  }
}

// Server action to deactivate a team
export async function deactivateTeam(data: DeleteTeamInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      return { error: "Không có quyền tạm dừng nhóm" };
    }

    // 3. Validate input data
    const validationResult = deleteTeamSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing team
    const existingTeam = await db
      .select({
        id: teams.id,
        teamCode: teams.teamCode,
        name: teams.name,
        teamType: teams.teamType,
        status: teams.status,
        deletedAt: teams.deletedAt,
      })
      .from(teams)
      .where(eq(teams.id, validatedData.id))
      .limit(1);

    if (existingTeam.length === 0) {
      return { error: "Không tìm thấy nhóm cần tạm dừng" };
    }

    const team = existingTeam[0];

    if (team.deletedAt) {
      return { error: "Nhóm đã được tạm dừng trước đó" };
    }

    if (team.status === "inactive") {
      return { error: "Nhóm đã ở trạng thái tạm dừng" };
    }

    // 5. Deactivate team (soft delete)
    await db
      .update(teams)
      .set({
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id));

    // 6. Revalidate cache and return success
    revalidatePath("/danh-muc/nhom");
    return {
      success: `Nhóm "${team.name}" (${
        team.teamCode || "No Code"
      }) đã được tạm dừng hoạt động`,
    };
  } catch (error) {
    console.error("Deactivate team error:", error);
    return { error: "Có lỗi xảy ra khi tạm dừng nhóm. Vui lòng thử lại." };
  }
}

// Server action to activate a team
export async function activateTeam(data: DeleteTeamInput) {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      return { error: "Không có quyền kích hoạt nhóm" };
    }

    // 3. Validate input data
    const validationResult = deleteTeamSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing team
    const existingTeam = await db
      .select({
        id: teams.id,
        teamCode: teams.teamCode,
        name: teams.name,
        teamType: teams.teamType,
        status: teams.status,
        deletedAt: teams.deletedAt,
      })
      .from(teams)
      .where(eq(teams.id, validatedData.id))
      .limit(1);

    if (existingTeam.length === 0) {
      return { error: "Không tìm thấy nhóm cần kích hoạt" };
    }

    const team = existingTeam[0];

    if (team.status === "active") {
      return { error: "Nhóm đã đang hoạt động" };
    }

    if (team.deletedAt) {
      return { error: "Không thể kích hoạt nhóm đã bị xóa vĩnh viễn" };
    }

    // 5. Activate team
    await db
      .update(teams)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(teams.id, validatedData.id));

    // 6. Revalidate cache and return success
    revalidatePath("/danh-muc/nhom");
    return {
      success: `Nhóm "${team.name}" (${
        team.teamCode || "No Code"
      }) đã được kích hoạt thành công`,
    };
  } catch (error) {
    console.error("Activate team error:", error);
    return { error: "Có lỗi xảy ra khi kích hoạt nhóm. Vui lòng thử lại." };
  }
}

// Get team by ID with manager details - for edit form initialization
export async function getTeamById(id: number): Promise<
  | {
      id: number;
      name: string;
      teamCode: string | null;
      teamType: string;
      region: string | null;
      address: string | null;
      managerId: number | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      manager: {
        id: number;
        name: string;
        email: string;
        department: string | null;
        jobTitle: string | null;
      } | null;
    }
  | { error: string }
> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // 2. Check team management permission (canManageKitchens covers all team types)
    const canManageTeams = await checkPermission(user.id, "canManageKitchens");
    if (!canManageTeams) {
      return { error: "Không có quyền quản lý nhóm" };
    }

    // 3. Fetch team with manager details using LEFT JOIN
    const teamData = await db
      .select({
        // Team fields
        id: teams.id,
        name: teams.name,
        teamCode: teams.teamCode,
        teamType: teams.teamType,
        region: teams.region,
        address: teams.address,
        managerId: teams.managerId,
        status: teams.status,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        // Manager fields (can be null if no manager assigned)
        managerName: users.name,
        managerEmail: users.email,
        managerDepartment: users.department,
        managerJobTitle: users.jobTitle,
      })
      .from(teams)
      .leftJoin(users, eq(teams.managerId, users.id))
      .where(
        and(
          eq(teams.id, id),
          isNull(teams.deletedAt) // Only get non-deleted teams
        )
      )
      .limit(1);

    if (teamData.length === 0) {
      return { error: "Không tìm thấy nhóm" };
    }

    const team = teamData[0];

    // 4. Structure the response with manager object
    return {
      id: team.id,
      name: team.name,
      teamCode: team.teamCode,
      teamType: team.teamType,
      region: team.region,
      address: team.address,
      managerId: team.managerId,
      status: team.status,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      manager:
        team.managerId && team.managerName
          ? {
              id: team.managerId,
              name: team.managerName,
              email: team.managerEmail || "",
              department: team.managerDepartment,
              jobTitle: team.managerJobTitle,
            }
          : null,
    };
  } catch (error) {
    console.error("Get team by ID error:", error);
    return { error: "Có lỗi xảy ra khi tải thông tin nhóm" };
  }
}
