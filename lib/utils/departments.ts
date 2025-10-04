/**
 * Client-safe department utilities
 * This file provides centralized department display logic.
 * SINGLE SOURCE OF TRUTH: Department enum is imported from permissions.ts
 */

import { Department } from '@/lib/auth/permissions';

// Department labels in Vietnamese
export const DEPARTMENT_LABELS: Record<Department, string> = {
  [Department.ADMIN]: 'Ban Giám Đốc',
  [Department.PROCUREMENT]: 'Phòng Mua hàng',
  [Department.ACCOUNTING]: 'Phòng Kế toán',
  [Department.HR]: 'Phòng Nhân sự',
  [Department.PRODUCTION]: 'Phòng Sản xuất',
  [Department.GENERAL_AFFAIRS]: 'Phòng Tổng vụ',
  [Department.LOGISTICS]: 'Phòng Điều vận',
  [Department.BUSINESS_DEVELOPMENT]: 'Phòng Phát triển Kinh doanh',
  [Department.KITCHEN]: 'Bếp',
  [Department.OPERATIONS]: 'Phòng Vận hành', // Legacy
};

/**
 * Get the Vietnamese label for a department
 */
export function getDepartmentLabel(department: Department): string {
  return DEPARTMENT_LABELS[department] || department;
}

/**
 * Department options for use in dropdowns (excluding legacy OPERATIONS)
 * Generated programmatically from the Department enum
 */
export const DEPARTMENT_OPTIONS = Object.values(Department)
  .filter(dept => dept !== Department.OPERATIONS) // Exclude legacy
  .map(dept => ({
    value: dept,
    label: DEPARTMENT_LABELS[dept],
  }));

/**
 * All department options including legacy (for backward compatibility in filters)
 */
export const ALL_DEPARTMENT_OPTIONS = Object.values(Department).map(dept => ({
  value: dept,
  label: DEPARTMENT_LABELS[dept],
}));

// Re-export Department enum for convenience
export { Department };
