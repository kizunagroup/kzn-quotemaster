/**
 * Client-Safe Role Definitions and Permission Mappings
 *
 * This file contains ONLY client-safe TypeScript definitions and constants.
 * It can be safely imported by both Server Components and Client Components.
 *
 * WARNING: This file must NOT import any server-only code (database queries, etc.)
 */

// Enhanced role definitions
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

  // OPERATIONS department roles (kept for backward compatibility)
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

  // HR department roles (placeholder - to be configured)
  'HR_SUPER_ADMIN': {
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
  },
  'HR_MANAGER': {
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
  },
  'HR_STAFF': {
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
  },
  'HR_VIEWER': {
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
  },

  // PRODUCTION department roles (placeholder - to be configured)
  'PRODUCTION_SUPER_ADMIN': {
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
  },
  'PRODUCTION_MANAGER': {
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
  },
  'PRODUCTION_STAFF': {
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
  },
  'PRODUCTION_VIEWER': {
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
  },

  // GENERAL_AFFAIRS department roles (placeholder - to be configured)
  'GENERAL_AFFAIRS_SUPER_ADMIN': {
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
  },
  'GENERAL_AFFAIRS_MANAGER': {
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
  },
  'GENERAL_AFFAIRS_STAFF': {
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
  },
  'GENERAL_AFFAIRS_VIEWER': {
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
  },

  // LOGISTICS department roles (placeholder - to be configured)
  'LOGISTICS_SUPER_ADMIN': {
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
  },
  'LOGISTICS_MANAGER': {
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
  },
  'LOGISTICS_STAFF': {
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
  },
  'LOGISTICS_VIEWER': {
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
  },

  // BUSINESS_DEVELOPMENT department roles (placeholder - to be configured)
  'BUSINESS_DEVELOPMENT_SUPER_ADMIN': {
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
  },
  'BUSINESS_DEVELOPMENT_MANAGER': {
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
  },
  'BUSINESS_DEVELOPMENT_STAFF': {
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
  },
  'BUSINESS_DEVELOPMENT_VIEWER': {
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
  },
};

/**
 * Client-safe utility functions for working with roles and permissions
 */

/**
 * Merge multiple permission sets to get the highest permission level
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
 * Get permissions for a list of roles
 */
export function getPermissionsForRoles(roles: Role[]): PermissionSet {
  const permissionSets = roles.map(role =>
    ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.member // Fallback to member
  );

  return mergePermissions(permissionSets);
}

/**
 * Parse role string into department and level components
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
 * Check if a role string is valid
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_PERMISSIONS;
}

/**
 * Get all roles for a specific department
 */
export function getRolesForDepartment(department: Department): string[] {
  return Object.values(Level).map(level => `${department}_${level}`);
}

/**
 * Get the highest role (SUPER_ADMIN) for a department
 */
export function getHighestRoleInDepartment(department: Department): string {
  return `${department}_SUPER_ADMIN`;
}

/**
 * Check if permissions allow a specific action
 */
export function hasPermission(
  permissions: PermissionSet | null,
  action: keyof PermissionSet
): boolean {
  if (!permissions) return false;
  return permissions[action] === true;
}

/**
 * Check if any role in the list is an admin role
 */
export function isAdmin(roles: Role[]): boolean {
  return roles.some(role => {
    const parsed = parseRole(role);
    return parsed?.department === 'ADMIN' || role === 'owner';
  });
}

/**
 * Check if any role has procurement access
 */
export function hasProcurementAccess(roles: Role[]): boolean {
  return roles.some(role => {
    const parsed = parseRole(role);
    return parsed?.department === 'PROCUREMENT' || parsed?.department === 'ADMIN' || role === 'owner';
  });
}
