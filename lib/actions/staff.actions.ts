'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams } from '@/lib/db/schema';
import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';
import { hashPassword } from '@/lib/auth/session';
import crypto from 'crypto';

import {
  createStaffSchema,
  updateStaffSchema,
  deleteStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
  type DeleteStaffInput,
  type Staff,
  type ActionResult
} from '@/lib/schemas/staff.schemas';

// Helper function to check employee code uniqueness
async function isEmployeeCodeUnique(employeeCode: string, excludeId?: number): Promise<boolean> {
  if (!employeeCode) return true; // Empty employee codes are allowed

  const trimmedCode = employeeCode.trim().toUpperCase();

  const conditions = [
    ilike(users.employeeCode, trimmedCode),
    isNull(users.deletedAt), // Only check active users
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${users.id} != ${excludeId}`);
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return existingUser.length === 0;
}

// Helper function to check email uniqueness
async function isEmailUnique(email: string, excludeId?: number): Promise<boolean> {
  const trimmedEmail = email.trim().toLowerCase();

  const conditions = [
    ilike(users.email, trimmedEmail),
    isNull(users.deletedAt), // Only check active users
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${users.id} != ${excludeId}`);
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return existingUser.length === 0;
}

// Helper function to generate secure random password
function generateSecurePassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }

  return password;
}

// Helper function to generate employee code
function generateEmployeeCode(): string {
  const currentYear = new Date().getFullYear();
  const randomSuffix = crypto.randomInt(1000, 9999);
  return `EMP${currentYear}${randomSuffix}`;
}

// Task 2.1.2: Server action to get staff with team assignments
export async function getStaff(): Promise<Staff[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Query users table with left join to teamMembers and teams
    const staffData = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        email: users.email,
        phone: users.phone,
        jobTitle: users.jobTitle,
        department: users.department,
        hireDate: users.hireDate,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Team assignment info
        teamMemberId: teamMembers.id,
        teamId: teamMembers.teamId,
        teamName: teams.name,
        teamRole: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          isNull(users.deletedAt), // Only active users
          sql`${users.status} != 'terminated'` // Exclude terminated staff
        )
      )
      .orderBy(users.name);

    // 4. Group results by user and collect team assignments
    const staffMap = new Map<number, Staff>();

    staffData.forEach(row => {
      if (!staffMap.has(row.id)) {
        staffMap.set(row.id, {
          id: row.id,
          employeeCode: row.employeeCode,
          name: row.name,
          email: row.email,
          phone: row.phone,
          jobTitle: row.jobTitle,
          department: row.department,
          hireDate: row.hireDate,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          currentTeams: [],
        });
      }

      // Add team assignment if exists
      if (row.teamMemberId && row.teamId && row.teamName) {
        staffMap.get(row.id)!.currentTeams!.push({
          teamId: row.teamId,
          teamName: row.teamName,
          role: row.teamRole,
          joinedAt: row.joinedAt,
        });
      }
    });

    // 5. Return staff array
    return Array.from(staffMap.values());

  } catch (error) {
    console.error('Get staff error:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.3: Server action to create new staff member
export async function createStaff(values: CreateStaffInput): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input with schema
    const validationResult = createStaffSchema.safeParse(values);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Check email uniqueness
    const emailIsUnique = await isEmailUnique(validatedData.email);
    if (!emailIsUnique) {
      return { error: 'Email đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.' };
    }

    // 5. Handle employee code (generate if not provided, validate if provided)
    let employeeCode = validatedData.employeeCode;
    if (!employeeCode) {
      // Generate unique employee code
      let attempts = 0;
      do {
        employeeCode = generateEmployeeCode();
        attempts++;
      } while (!(await isEmployeeCodeUnique(employeeCode)) && attempts < 10);

      if (attempts >= 10) {
        return { error: 'Không thể tạo mã nhân viên duy nhất. Vui lòng thử lại.' };
      }
    } else {
      // Validate provided employee code uniqueness
      const codeIsUnique = await isEmployeeCodeUnique(employeeCode);
      if (!codeIsUnique) {
        return { error: 'Mã nhân viên đã tồn tại. Vui lòng chọn mã khác.' };
      }
    }

    // 6. Generate secure temporary password and hash it
    const temporaryPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(temporaryPassword);

    // 7. Insert new staff member into users table
    const newStaff = await db
      .insert(users)
      .values({
        employeeCode: employeeCode.toUpperCase(),
        name: validatedData.name.trim(),
        email: validatedData.email.toLowerCase(),
        passwordHash: hashedPassword,
        phone: validatedData.phone?.trim() || null,
        jobTitle: validatedData.jobTitle?.trim() || null,
        department: validatedData.department.trim(),
        hireDate: validatedData.hireDate ? new Date(validatedData.hireDate) : null,
        status: 'active', // Default status for new staff
        role: 'member', // Default template role
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        email: users.email,
      });

    // 8. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${newStaff[0].name}" (${newStaff[0].employeeCode}) đã được tạo thành công. ` +
               `Mật khẩu tạm thời: ${temporaryPassword}. ` +
               `Vui lòng thông báo cho nhân viên đổi mật khẩu sau khi đăng nhập lần đầu.`
    };

  } catch (error) {
    console.error('Create staff error:', error);
    return { error: 'Có lỗi xảy ra khi tạo nhân viên. Vui lòng thử lại.' };
  }
}

// Get staff by ID for edit operations
export async function getStaffById(id: number): Promise<Staff | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Query specific staff member with team assignments
    const staffData = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        email: users.email,
        phone: users.phone,
        jobTitle: users.jobTitle,
        department: users.department,
        hireDate: users.hireDate,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Team assignment info
        teamMemberId: teamMembers.id,
        teamId: teamMembers.teamId,
        teamName: teams.name,
        teamRole: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(users.id, id),
          isNull(users.deletedAt)
        )
      );

    if (staffData.length === 0) {
      return { error: 'Không tìm thấy nhân viên' };
    }

    // 4. Build staff object with team assignments
    const firstRow = staffData[0];
    const staff: Staff = {
      id: firstRow.id,
      employeeCode: firstRow.employeeCode,
      name: firstRow.name,
      email: firstRow.email,
      phone: firstRow.phone,
      jobTitle: firstRow.jobTitle,
      department: firstRow.department,
      hireDate: firstRow.hireDate,
      status: firstRow.status,
      createdAt: firstRow.createdAt,
      updatedAt: firstRow.updatedAt,
      currentTeams: [],
    };

    // Add team assignments
    staffData.forEach(row => {
      if (row.teamMemberId && row.teamId && row.teamName) {
        staff.currentTeams!.push({
          teamId: row.teamId,
          teamName: row.teamName,
          role: row.teamRole,
          joinedAt: row.joinedAt,
        });
      }
    });

    return staff;

  } catch (error) {
    console.error('Get staff by ID error:', error);
    return { error: 'Có lỗi xảy ra khi tải thông tin nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.4: Server action to update staff information
export async function updateStaff(values: UpdateStaffInput): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input with schema
    const validationResult = updateStaffSchema.safeParse(values);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Fetch existing staff member to ensure they exist
    const existingStaff = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        email: users.email,
        phone: users.phone,
        jobTitle: users.jobTitle,
        department: users.department,
        hireDate: users.hireDate,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, validatedData.id))
      .limit(1);

    if (existingStaff.length === 0) {
      return { error: 'Không tìm thấy nhân viên cần cập nhật' };
    }

    const currentStaff = existingStaff[0];

    if (currentStaff.deletedAt) {
      return { error: 'Không thể cập nhật nhân viên đã bị xóa' };
    }

    // 5. Check email uniqueness if being changed
    if (validatedData.email && validatedData.email !== currentStaff.email) {
      const emailIsUnique = await isEmailUnique(validatedData.email, validatedData.id);
      if (!emailIsUnique) {
        return { error: 'Email đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.' };
      }
    }

    // 6. Check employee code uniqueness if being changed
    if (validatedData.employeeCode && validatedData.employeeCode !== currentStaff.employeeCode) {
      const codeIsUnique = await isEmployeeCodeUnique(validatedData.employeeCode, validatedData.id);
      if (!codeIsUnique) {
        return { error: 'Mã nhân viên đã tồn tại. Vui lòng chọn mã khác.' };
      }
    }

    // 7. Build update data with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that were provided
    if (validatedData.employeeCode !== undefined) {
      updateData.employeeCode = validatedData.employeeCode.toUpperCase();
    }
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name.trim();
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email.toLowerCase();
    }
    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone?.trim() || null;
    }
    if (validatedData.jobTitle !== undefined) {
      updateData.jobTitle = validatedData.jobTitle?.trim() || null;
    }
    if (validatedData.department !== undefined) {
      updateData.department = validatedData.department.trim();
    }
    if (validatedData.hireDate !== undefined) {
      updateData.hireDate = validatedData.hireDate ? new Date(validatedData.hireDate) : null;
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    // 8. Execute update command
    const updatedStaff = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, validatedData.id))
      .returning({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        email: users.email,
      });

    // 9. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${updatedStaff[0].name}" (${updatedStaff[0].employeeCode}) đã được cập nhật thành công`
    };

  } catch (error) {
    console.error('Update staff error:', error);
    return { error: 'Có lỗi xảy ra khi cập nhật nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.5: Server action to deactivate staff member (soft delete)
export async function deactivateStaff(values: DeleteStaffInput): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input data
    const validationResult = deleteStaffSchema.safeParse(values);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Check if staff exists and is currently active
    const existingStaff = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, validatedData.id))
      .limit(1);

    if (existingStaff.length === 0) {
      return { error: 'Không tìm thấy nhân viên cần tạm dừng' };
    }

    const staff = existingStaff[0];

    if (staff.status === 'inactive') {
      return { error: 'Nhân viên này đã được tạm dừng hoạt động' };
    }

    if (staff.deletedAt) {
      return { error: 'Nhân viên này đã bị xóa khỏi hệ thống' };
    }

    // 5. Deactivate staff by setting status to inactive (do NOT set deletedAt)
    // Note: Team assignments are preserved for audit trail
    // deletedAt should only be set for actual deletion, not deactivation
    const deactivatedStaff = await db
      .update(users)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(users.id, validatedData.id))
      .returning({
        employeeCode: users.employeeCode,
        name: users.name,
      });

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${deactivatedStaff[0].name}" (${deactivatedStaff[0].employeeCode}) đã được tạm dừng hoạt động`
    };

  } catch (error) {
    console.error('Deactivate staff error:', error);
    return { error: 'Có lỗi xảy ra khi tạm dừng nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.5: Server action to activate staff member
export async function activateStaff(data: { id: number }): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input data
    const validationResult = z.object({ id: z.number().positive() }).safeParse(data);
    if (!validationResult.success) {
      return { error: 'ID nhân viên không hợp lệ' };
    }

    const validatedData = validationResult.data;

    // 4. Check if staff exists and is currently inactive
    const existingStaff = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, validatedData.id))
      .limit(1);

    if (existingStaff.length === 0) {
      return { error: 'Không tìm thấy nhân viên cần kích hoạt' };
    }

    const staff = existingStaff[0];

    if (staff.status === 'active' && !staff.deletedAt) {
      return { error: 'Nhân viên này đã đang hoạt động' };
    }

    if (staff.status === 'terminated') {
      return { error: 'Không thể kích hoạt nhân viên đã bị chấm dứt hợp đồng' };
    }

    // 5. Activate staff by setting status to active and clearing deletedAt
    const activatedStaff = await db
      .update(users)
      .set({
        status: 'active',
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, validatedData.id))
      .returning({
        employeeCode: users.employeeCode,
        name: users.name,
      });

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${activatedStaff[0].name}" (${activatedStaff[0].employeeCode}) đã được kích hoạt lại`
    };

  } catch (error) {
    console.error('Activate staff error:', error);
    return { error: 'Có lỗi xảy ra khi kích hoạt nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.5: Server action to terminate staff member (permanent termination)
export async function terminateStaff(data: { id: number }): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input data
    const validationResult = z.object({ id: z.number().positive() }).safeParse(data);
    if (!validationResult.success) {
      return { error: 'ID nhân viên không hợp lệ' };
    }

    const validatedData = validationResult.data;

    // 4. Check if staff exists and is not already terminated
    const existingStaff = await db
      .select({
        id: users.id,
        employeeCode: users.employeeCode,
        name: users.name,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, validatedData.id))
      .limit(1);

    if (existingStaff.length === 0) {
      return { error: 'Không tìm thấy nhân viên cần chấm dứt hợp đồng' };
    }

    const staff = existingStaff[0];

    if (staff.status === 'terminated') {
      return { error: 'Nhân viên này đã được chấm dứt hợp đồng' };
    }

    if (staff.deletedAt) {
      return { error: 'Nhân viên này đã bị xóa khỏi hệ thống' };
    }

    // 5. Terminate staff by setting status to terminated and deletedAt timestamp
    const terminatedStaff = await db
      .update(users)
      .set({
        status: 'terminated',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, validatedData.id))
      .returning({
        employeeCode: users.employeeCode,
        name: users.name,
      });

    // 6. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${terminatedStaff[0].name}" (${terminatedStaff[0].employeeCode}) đã được chấm dứt hợp đồng`
    };

  } catch (error) {
    console.error('Terminate staff error:', error);
    return { error: 'Có lỗi xảy ra khi chấm dứt hợp đồng nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.6: Server action to get teams available for assignment
export async function getTeamsForAssignment(): Promise<{ id: number; name: string; type: string }[] | { error: string }> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Query all active teams
    const availableTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        teamType: teams.teamType,
        status: teams.status,
      })
      .from(teams)
      .where(
        and(
          isNull(teams.deletedAt), // Only active teams
          eq(teams.status, 'active') // Only teams with active status
        )
      )
      .orderBy(teams.teamType, teams.name); // Sort by type, then name

    // 4. Return formatted data suitable for assignment selection
    return availableTeams.map(team => ({
      id: team.id,
      name: team.name,
      type: team.teamType || 'OFFICE', // Default to OFFICE if null
    }));

  } catch (error) {
    console.error('Get teams for assignment error:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách nhóm. Vui lòng thử lại.' };
  }
}

// Task 2.1.6: Server action to assign staff to team
export async function assignStaffToTeam(staffId: number, teamId: number, role: string): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input parameters
    const assignmentSchema = z.object({
      staffId: z.number().positive('ID nhân viên không hợp lệ'),
      teamId: z.number().positive('ID nhóm không hợp lệ'),
      role: z.string().min(1, 'Vai trò là bắt buộc').max(50, 'Vai trò không được vượt quá 50 ký tự'),
    });

    const validationResult = assignmentSchema.safeParse({ staffId, teamId, role });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Verify staff member exists and is active
    const staff = await db
      .select({
        id: users.id,
        name: users.name,
        employeeCode: users.employeeCode,
        status: users.status,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, validatedData.staffId))
      .limit(1);

    if (staff.length === 0) {
      return { error: 'Không tìm thấy nhân viên' };
    }

    if (staff[0].deletedAt || staff[0].status !== 'active') {
      return { error: 'Không thể phân công nhân viên không hoạt động' };
    }

    // 5. Verify team exists and is active
    const team = await db
      .select({
        id: teams.id,
        name: teams.name,
        teamType: teams.teamType,
        status: teams.status,
        deletedAt: teams.deletedAt,
      })
      .from(teams)
      .where(eq(teams.id, validatedData.teamId))
      .limit(1);

    if (team.length === 0) {
      return { error: 'Không tìm thấy nhóm' };
    }

    if (team[0].deletedAt || team[0].status !== 'active') {
      return { error: 'Không thể phân công vào nhóm không hoạt động' };
    }

    // 6. Check for existing assignment to prevent duplicates
    const existingAssignment = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, validatedData.staffId),
          eq(teamMembers.teamId, validatedData.teamId)
        )
      )
      .limit(1);

    if (existingAssignment.length > 0) {
      return { error: 'Nhân viên đã được phân công vào nhóm này' };
    }

    // 7. Create new team assignment
    await db
      .insert(teamMembers)
      .values({
        userId: validatedData.staffId,
        teamId: validatedData.teamId,
        role: validatedData.role,
        joinedAt: new Date(),
      });

    // 8. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    return {
      success: `Nhân viên "${staff[0].name}" (${staff[0].employeeCode}) đã được phân công vào nhóm "${team[0].name}" với vai trò: ${validatedData.role}`
    };

  } catch (error) {
    console.error('Assign staff to team error:', error);
    return { error: 'Có lỗi xảy ra khi phân công nhân viên. Vui lòng thử lại.' };
  }
}

// Task 2.1.6: Server action to remove staff from team
export async function removeStaffFromTeam(staffId: number, teamId: number): Promise<ActionResult> {
  try {
    // 1. Authorization check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // 2. Check staff management permission
    const canManageStaff = await checkPermission(user.id, 'canManageStaff');
    if (!canManageStaff) {
      return { error: 'Không có quyền quản lý nhân viên' };
    }

    // 3. Validate input parameters
    const removalSchema = z.object({
      staffId: z.number().positive('ID nhân viên không hợp lệ'),
      teamId: z.number().positive('ID nhóm không hợp lệ'),
    });

    const validationResult = removalSchema.safeParse({ staffId, teamId });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return { error: `Dữ liệu không hợp lệ: ${errors}` };
    }

    const validatedData = validationResult.data;

    // 4. Verify assignment exists
    const assignment = await db
      .select({
        id: teamMembers.id,
        role: teamMembers.role,
        userId: teamMembers.userId,
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, validatedData.staffId),
          eq(teamMembers.teamId, validatedData.teamId)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return { error: 'Không tìm thấy phân công này' };
    }

    // 5. Get staff and team info for success message
    const staffInfo = await db
      .select({
        name: users.name,
        employeeCode: users.employeeCode,
      })
      .from(users)
      .where(eq(users.id, validatedData.staffId))
      .limit(1);

    const teamInfo = await db
      .select({
        name: teams.name,
      })
      .from(teams)
      .where(eq(teams.id, validatedData.teamId))
      .limit(1);

    // 6. Remove team assignment
    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, validatedData.staffId),
          eq(teamMembers.teamId, validatedData.teamId)
        )
      );

    // 7. Revalidate cache and return success
    revalidatePath('/danh-muc/nhan-vien');

    const staffName = staffInfo[0]?.name || 'Không xác định';
    const staffCode = staffInfo[0]?.employeeCode || 'N/A';
    const teamName = teamInfo[0]?.name || 'Không xác định';

    return {
      success: `Đã hủy phân công nhân viên "${staffName}" (${staffCode}) khỏi nhóm "${teamName}"`
    };

  } catch (error) {
    console.error('Remove staff from team error:', error);
    return { error: 'Có lỗi xảy ra khi hủy phân công nhân viên. Vui lòng thử lại.' };
  }
}