/**
 * Server-Only Permission Utilities
 *
 * ⚠️ WARNING: This file is SERVER-ONLY. Do NOT import this file in Client Components.
 *
 * This file contains functions that require server-side database access.
 * For client-safe role definitions and utilities, import from:
 * @/lib/config/roles
 */

import { getUserWithTeams, getUserTeams } from '@/lib/db/queries';
import {
  Department,
  Level,
  ROLE_PERMISSIONS,
  PermissionSet,
  Role,
  mergePermissions,
  parseRole
} from '@/lib/config/roles';

// Re-export client-safe types and utilities for convenience
export {
  Department,
  Level,
  ROLE_PERMISSIONS,
  type PermissionSet,
  type Role,
  type QuoteMasterRole,
  type TemplateRole,
  mergePermissions,
  parseRole,
  isValidRole,
  getRolesForDepartment,
  getHighestRoleInDepartment,
  hasPermission,
  isAdmin,
  hasProcurementAccess
} from '@/lib/config/roles';

/**
 * SERVER-ONLY: Get user permissions based on their team memberships
 *
 * This function queries the database to get all teams the user belongs to,
 * then merges the permissions from all their roles.
 */
export async function getUserPermissions(userId: number): Promise<PermissionSet> {
  try {
    const userWithTeams = await getUserWithTeams(userId);
    if (!userWithTeams) {
      throw new Error("User not found");
    }

    // Get all permission sets from user's roles across teams
    const allPermissions = userWithTeams.teams.map(tm => {
      const role = tm.role as Role;
      return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member; // Fallback to member
    });

    // Merge permissions to get the highest privilege level
    return mergePermissions(allPermissions);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    // Return most restrictive permissions on error
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
}

/**
 * SERVER-ONLY: Check if user has a specific permission
 *
 * Optionally verifies team membership if the action requires team restriction.
 */
export async function checkPermission(
  userId: number,
  action: keyof PermissionSet,
  teamId?: number
): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId);

    // First check if user has the required permission
    if (!userPermissions[action]) {
      return false;
    }

    // If action requires team restriction, verify user has access to team
    if (userPermissions.teamRestricted && teamId) {
      const userTeams = await getUserTeams(userId);
      return userTeams.some(team => team.teamId === teamId);
    }

    // If not team restricted or no specific team required, allow access
    return true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * SERVER-ONLY: Check if user has any role in a department
 */
export async function userHasRoleInDepartment(userId: number, department: Department): Promise<boolean> {
  try {
    const userWithTeams = await getUserWithTeams(userId);
    if (!userWithTeams) return false;

    return userWithTeams.teams.some(tm => {
      const parsedRole = parseRole(tm.role);
      return parsedRole?.department === department;
    });
  } catch (error) {
    console.error('Error checking user department role:', error);
    return false;
  }
}

/**
 * SERVER-ONLY: Get user's highest level in a department
 */
export async function getUserHighestLevelInDepartment(userId: number, department: Department): Promise<Level | null> {
  try {
    const userWithTeams = await getUserWithTeams(userId);
    if (!userWithTeams) return null;

    const departmentRoles = userWithTeams.teams
      .map(tm => parseRole(tm.role))
      .filter(role => role?.department === department)
      .map(role => role!.level as Level);

    if (departmentRoles.length === 0) return null;

    // Return highest level (SUPER_ADMIN > MANAGER > STAFF > VIEWER)
    const levelHierarchy = [Level.SUPER_ADMIN, Level.MANAGER, Level.STAFF, Level.VIEWER];
    for (const level of levelHierarchy) {
      if (departmentRoles.includes(level)) {
        return level;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user highest level:', error);
    return null;
  }
}
