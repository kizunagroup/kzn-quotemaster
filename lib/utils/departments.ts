/**
 * Client-safe department utilities
 * This file provides centralized department display logic and MUST remain 100% client-safe.
 * DO NOT import anything from permissions.ts or other server-only files.
 */

// Department enum (duplicated here to keep this file client-safe)
export enum Department {
  ADMIN = 'ADMIN',
  PROCUREMENT = 'PROCUREMENT',
  ACCOUNTING = 'ACCOUNTING',
  HR = 'HR',
  PRODUCTION = 'PRODUCTION',
  GENERAL_AFFAIRS = 'GENERAL_AFFAIRS',
  LOGISTICS = 'LOGISTICS',
  BUSINESS_DEVELOPMENT = 'BUSINESS_DEVELOPMENT',
  KITCHEN = 'KITCHEN',
  OPERATIONS = 'OPERATIONS' // Keep for backward compatibility
}

// Department labels in Vietnamese
export const DEPARTMENT_LABELS: Record<Department, string> = {
  [Department.ADMIN]: 'Hành chính',
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
 */
export const DEPARTMENT_OPTIONS = [
  { value: Department.ADMIN, label: DEPARTMENT_LABELS[Department.ADMIN] },
  { value: Department.PROCUREMENT, label: DEPARTMENT_LABELS[Department.PROCUREMENT] },
  { value: Department.ACCOUNTING, label: DEPARTMENT_LABELS[Department.ACCOUNTING] },
  { value: Department.HR, label: DEPARTMENT_LABELS[Department.HR] },
  { value: Department.PRODUCTION, label: DEPARTMENT_LABELS[Department.PRODUCTION] },
  { value: Department.GENERAL_AFFAIRS, label: DEPARTMENT_LABELS[Department.GENERAL_AFFAIRS] },
  { value: Department.LOGISTICS, label: DEPARTMENT_LABELS[Department.LOGISTICS] },
  { value: Department.BUSINESS_DEVELOPMENT, label: DEPARTMENT_LABELS[Department.BUSINESS_DEVELOPMENT] },
  { value: Department.KITCHEN, label: DEPARTMENT_LABELS[Department.KITCHEN] },
];

/**
 * All department options including legacy (for backward compatibility in filters)
 */
export const ALL_DEPARTMENT_OPTIONS = [
  ...DEPARTMENT_OPTIONS,
  { value: Department.OPERATIONS, label: DEPARTMENT_LABELS[Department.OPERATIONS] },
];
