/**
 * Client-safe authentication utilities
 *
 * This file re-exports all client-safe utilities from @/lib/config/roles
 * for backward compatibility.
 *
 * ⚠️ DEPRECATION NOTICE: This file is deprecated. Please import directly from:
 * @/lib/config/roles
 */

export {
  Department,
  Level,
  ROLE_PERMISSIONS,
  type PermissionSet,
  type Role,
  type QuoteMasterRole,
  type TemplateRole,
  mergePermissions,
  getPermissionsForRoles,
  parseRole,
  isValidRole,
  getRolesForDepartment,
  getHighestRoleInDepartment,
  hasPermission,
  isAdmin,
  hasProcurementAccess
} from '@/lib/config/roles';
