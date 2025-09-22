'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams } from '@/lib/db/schema';
import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';
import { hashPassword } from '@/lib/auth/session';
import crypto from 'crypto';

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
    .refine(
      (date) => !date || !isNaN(Date.parse(date)),
      'Ngày vào làm không hợp lệ'
    ),
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