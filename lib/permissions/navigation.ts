/**
 * Navigation Permission Utilities
 *
 * Provides role-based filtering and access control for navigation menu items.
 * Supports wildcard role patterns (e.g., 'ADMIN_*' matches 'ADMIN_SUPER_ADMIN', 'ADMIN_MANAGER').
 */

import { NavigationItem, NavigationSection } from '@/lib/config/navigation';

/**
 * Check if a user role matches a role pattern
 *
 * Supports wildcard matching:
 * - Pattern 'ADMIN_*' matches 'ADMIN_SUPER_ADMIN', 'ADMIN_MANAGER', etc.
 * - Pattern 'PROCUREMENT_*' matches 'PROCUREMENT_MANAGER', 'PROCUREMENT_STAFF', etc.
 * - Exact match: 'PROCUREMENT_MANAGER' only matches 'PROCUREMENT_MANAGER'
 *
 * @param userRole - The user's actual role (e.g., 'ADMIN_SUPER_ADMIN')
 * @param pattern - The role pattern to match against (e.g., 'ADMIN_*' or 'PROCUREMENT_MANAGER')
 * @returns true if the user role matches the pattern
 */
export function matchesRolePattern(userRole: string, pattern: string): boolean {
  // If pattern is an exact match
  if (userRole === pattern) {
    return true;
  }

  // If pattern contains wildcard (*)
  if (pattern.includes('*')) {
    // Replace * with regex pattern to match anything
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(userRole);
  }

  // No match
  return false;
}

/**
 * Check if a user has access to a navigation item based on their role
 *
 * @param item - The navigation item to check
 * @param userRole - The user's role (e.g., 'ADMIN_SUPER_ADMIN', 'PROCUREMENT_MANAGER')
 * @returns true if the user has access to this item
 */
export function hasAccessToNavigationItem(
  item: NavigationItem,
  userRole: string | null | undefined
): boolean {
  // If no role is specified on the item, it's accessible to all authenticated users
  if (!item.roles || item.roles.length === 0) {
    return true;
  }

  // If user has no role, deny access
  if (!userRole) {
    return false;
  }

  // Check if user's role matches any of the allowed role patterns
  return item.roles.some(pattern => matchesRolePattern(userRole, pattern));
}

/**
 * Filter navigation items based on user role
 *
 * @param items - Array of navigation items to filter
 * @param userRole - The user's role
 * @returns Filtered array containing only items the user has access to
 */
export function filterNavigationItems(
  items: NavigationItem[],
  userRole: string | null | undefined
): NavigationItem[] {
  return items.filter(item => hasAccessToNavigationItem(item, userRole));
}

/**
 * Filter a navigation section based on user role
 *
 * Returns the section with only the items the user has access to.
 * If no items are accessible, returns null.
 *
 * @param section - The navigation section to filter
 * @param userRole - The user's role
 * @returns Filtered section or null if no items are accessible
 */
export function filterNavigationSection(
  section: NavigationSection,
  userRole: string | null | undefined
): NavigationSection | null {
  const filteredItems = filterNavigationItems(section.items, userRole);

  // If no items are accessible, don't show the section
  if (filteredItems.length === 0) {
    return null;
  }

  return {
    ...section,
    items: filteredItems
  };
}

/**
 * Filter multiple navigation sections based on user role
 *
 * @param sections - Array of navigation sections to filter
 * @param userRole - The user's role
 * @returns Filtered array of sections (excludes sections with no accessible items)
 */
export function filterNavigationSections(
  sections: NavigationSection[],
  userRole: string | null | undefined
): NavigationSection[] {
  return sections
    .map(section => filterNavigationSection(section, userRole))
    .filter((section): section is NavigationSection => section !== null);
}

/**
 * Main function to filter menu by role
 *
 * This is the primary function to use in components for role-based menu filtering.
 *
 * @param menuItems - Can be a single section, array of sections, or array of items
 * @param userRole - The user's role (from team_members.role field)
 * @returns Filtered menu structure based on user permissions
 */
export function filterMenuByRole(
  menuItems: NavigationSection[] | NavigationItem[],
  userRole: string | null | undefined
): NavigationSection[] | NavigationItem[] {
  // Check if input is an array of sections or items
  if (menuItems.length === 0) {
    return [];
  }

  // Type guard: check if first item has 'items' property (NavigationSection)
  const firstItem = menuItems[0];
  if ('items' in firstItem) {
    // It's an array of NavigationSection
    return filterNavigationSections(
      menuItems as NavigationSection[],
      userRole
    );
  } else {
    // It's an array of NavigationItem
    return filterNavigationItems(menuItems as NavigationItem[], userRole);
  }
}

/**
 * Check if user has access to any item in a section
 *
 * Useful for determining if a section header should be shown
 *
 * @param section - The navigation section
 * @param userRole - The user's role
 * @returns true if user has access to at least one item in the section
 */
export function hasAccessToSection(
  section: NavigationSection,
  userRole: string | null | undefined
): boolean {
  return section.items.some(item => hasAccessToNavigationItem(item, userRole));
}

/**
 * Get accessible navigation paths for a user
 *
 * Returns array of hrefs the user can access, useful for route protection
 *
 * @param allItems - All navigation items
 * @param userRole - The user's role
 * @returns Array of accessible paths
 */
export function getAccessiblePaths(
  allItems: NavigationItem[],
  userRole: string | null | undefined
): string[] {
  return filterNavigationItems(allItems, userRole).map(item => item.href);
}
