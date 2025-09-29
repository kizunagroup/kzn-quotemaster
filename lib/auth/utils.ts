/**
 * Client-safe authentication utilities
 * This file contains functions that can be safely imported by Client Components
 * because they do not use server-only modules like 'next/headers'
 */

import { Department, Level, ROLE_PERMISSIONS, type PermissionSet, type Role } from './permissions';

/**
 * Client-safe utility function to merge permissions (get highest permission level)
 */
export function mergePermissions(permissionSets: PermissionSet[]): PermissionSet {
  if (permissionSets.length === 0) {
    // Default to most restrictive permissions
    return {
      canViewQuotes: false,
      canCreateQuotes: false,
      canApproveQuotes: false,
      canNegotiateQuotes: false,
      canManageProducts: false,
      canManageSuppliers: false,
      canManageKitchens: false,
      canManageStaff: false,
      canViewAnalytics: false,
      canExportData: false,
      teamRestricted: true,
    };
  }

  return permissionSets.reduce((merged, current) => ({
    canViewQuotes: merged.canViewQuotes || current.canViewQuotes,
    canCreateQuotes: merged.canCreateQuotes || current.canCreateQuotes,
    canApproveQuotes: merged.canApproveQuotes || current.canApproveQuotes,
    canNegotiateQuotes: merged.canNegotiateQuotes || current.canNegotiateQuotes,
    canManageProducts: merged.canManageProducts || current.canManageProducts,
    canManageSuppliers: merged.canManageSuppliers || current.canManageSuppliers,
    canManageKitchens: merged.canManageKitchens || current.canManageKitchens,
    canManageStaff: merged.canManageStaff || current.canManageStaff,
    canViewAnalytics: merged.canViewAnalytics || current.canViewAnalytics,
    canExportData: merged.canExportData || current.canExportData,
    // If ANY role is not team restricted, user has global access
    teamRestricted: merged.teamRestricted && current.teamRestricted,
  }));
}

/**
 * Client-safe function to get permissions for a list of roles
 */
export function getPermissionsForRoles(roles: Role[]): PermissionSet {
  const permissionSets = roles.map(role =>
    ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member // Fallback to member
  );

  return mergePermissions(permissionSets);
}

/**
 * Client-safe function to parse role string
 */
export function parseRole(role: string): { department: string; level: string } | null {
  // Handle template roles
  if (role === 'owner' || role === 'member') {
    return {
      department: 'TEMPLATE',
      level: role.toUpperCase()
    };
  }

  // Handle QuoteMaster enhanced roles
  const parts = role.split('_');
  if (parts.length === 2) {
    const [department, level] = parts;

    // Validate department and level
    if (Object.values(Department).includes(department as Department) &&
        Object.values(Level).includes(level as Level)) {
      return { department, level };
    }
  }

  return null;
}

/**
 * Client-safe function to check if a role is valid
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

/**
 * Client-safe function to get all roles for a department
 */
export function getRolesForDepartment(department: Department): string[] {
  return Object.values(Level).map(level => `${department}_${level}`);
}

/**
 * Client-safe function to get the highest role in a department
 */
export function getHighestRoleInDepartment(department: Department): string {
  return `${department}_SUPER_ADMIN`;
}

/**
 * Client-safe function to check permission for a specific action
 */
export function hasPermission(
  permissions: PermissionSet | null,
  action: keyof PermissionSet
): boolean {
  if (!permissions) return false;
  return permissions[action] === true;
}

/**
 * Client-safe function to check if user has any admin role
 */
export function isAdmin(roles: Role[]): boolean {
  return roles.some(role => {
    const parsed = parseRole(role);
    return parsed?.department === 'ADMIN' || role === 'owner';
  });
}

/**
 * Client-safe function to check if user has procurement role
 */
export function hasProcurementAccess(roles: Role[]): boolean {
  return roles.some(role => {
    const parsed = parseRole(role);
    return parsed?.department === 'PROCUREMENT' || parsed?.department === 'ADMIN' || role === 'owner';
  });
}