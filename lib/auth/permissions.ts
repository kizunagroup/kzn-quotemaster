import { getUserWithTeams, getUserTeams } from '@/lib/db/queries';

// Enhanced role definitions
export enum Department {
  ADMIN = 'ADMIN',
  PROCUREMENT = 'PROCUREMENT',
  KITCHEN = 'KITCHEN',
  ACCOUNTING = 'ACCOUNTING',
  OPERATIONS = 'OPERATIONS'
}

export enum Level {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER'
}

// Role type definitions
export type QuoteMasterRole = `${Department}_${Level}`;
export type TemplateRole = 'owner' | 'member';
export type Role = QuoteMasterRole | TemplateRole;

// Permission interface
export interface PermissionSet {
  canViewQuotes: boolean;
  canCreateQuotes: boolean;
  canApproveQuotes: boolean;
  canNegotiateQuotes: boolean;
  canManageProducts: boolean;
  canManageSuppliers: boolean;
  canManageKitchens: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  teamRestricted: boolean; // Can only access data from assigned teams
}

// Complete role permissions mapping
export const ROLE_PERMISSIONS: Record<Role, PermissionSet> = {
  // Template roles (backward compatibility)
  'owner': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: true,
    canNegotiateQuotes: true,
    canManageProducts: true,
    canManageSuppliers: true,
    canManageKitchens: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'member': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: false,
    teamRestricted: true,
  },

  // QuoteMaster enhanced roles - ADMIN department
  'ADMIN_SUPER_ADMIN': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: true,
    canNegotiateQuotes: true,
    canManageProducts: true,
    canManageSuppliers: true,
    canManageKitchens: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'ADMIN_MANAGER': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: true,
    canNegotiateQuotes: true,
    canManageProducts: true,
    canManageSuppliers: true,
    canManageKitchens: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'ADMIN_STAFF': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'ADMIN_VIEWER': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: false,
    teamRestricted: false,
  },

  // PROCUREMENT department roles
  'PROCUREMENT_SUPER_ADMIN': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: true,
    canNegotiateQuotes: true,
    canManageProducts: true,
    canManageSuppliers: true,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'PROCUREMENT_MANAGER': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: true,
    canNegotiateQuotes: true,
    canManageProducts: true,
    canManageSuppliers: true,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'PROCUREMENT_STAFF': {
    canViewQuotes: true,
    canCreateQuotes: true,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'PROCUREMENT_VIEWER': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: false,
    teamRestricted: false,
  },

  // KITCHEN department roles
  'KITCHEN_SUPER_ADMIN': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: true,
  },
  'KITCHEN_MANAGER': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: true,
  },
  'KITCHEN_STAFF': {
    canViewQuotes: true,
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
  },
  'KITCHEN_VIEWER': {
    canViewQuotes: true,
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
  },

  // ACCOUNTING department roles
  'ACCOUNTING_SUPER_ADMIN': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'ACCOUNTING_MANAGER': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'ACCOUNTING_STAFF': {
    canViewQuotes: true,
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
  },
  'ACCOUNTING_VIEWER': {
    canViewQuotes: true,
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
  },

  // OPERATIONS department roles
  'OPERATIONS_SUPER_ADMIN': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'OPERATIONS_MANAGER': {
    canViewQuotes: true,
    canCreateQuotes: false,
    canApproveQuotes: false,
    canNegotiateQuotes: false,
    canManageProducts: false,
    canManageSuppliers: false,
    canManageKitchens: false,
    canManageStaff: false,
    canViewAnalytics: true,
    canExportData: true,
    teamRestricted: false,
  },
  'OPERATIONS_STAFF': {
    canViewQuotes: true,
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
  },
  'OPERATIONS_VIEWER': {
    canViewQuotes: true,
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
  },
};

// Import client-safe utility functions
import { mergePermissions, parseRole } from './utils';

// Authorization utility functions

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
      return userTeams.some(team => team.id === teamId);
    }

    // If not team restricted or no specific team required, allow access
    return true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Export client-safe utility functions from utils.ts
export { parseRole, isValidRole, getRolesForDepartment, getHighestRoleInDepartment } from './utils';

// Helper function to check if user has any role in a department
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

// Helper function to get user's highest level in a department
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