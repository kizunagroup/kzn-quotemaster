/**
 * Navigation Configuration for QuoteMaster
 *
 * Defines the complete menu structure with Vietnamese labels, routes, icons, and role requirements.
 * This configuration is used by the sidebar navigation component to render menu items
 * with role-based visibility filtering.
 */

import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  href: string;
  label: string;
  icon: string; // Icon name from lucide-react
  roles?: string[]; // Array of role patterns (supports wildcards like 'ADMIN_*')
  description?: string; // Optional tooltip or description
}

export interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

export interface NavigationConfig {
  home: NavigationSection;
  quoteManagement: NavigationSection;
  administration: NavigationSection;
}

/**
 * Main navigation configuration
 *
 * Role patterns support wildcards:
 * - 'ADMIN_*' matches any role starting with 'ADMIN_' (e.g., ADMIN_SUPER_ADMIN, ADMIN_MANAGER)
 * - Exact role match: 'PROCUREMENT_MANAGER'
 * - Multiple patterns: ['ADMIN_*', 'PROCUREMENT_MANAGER']
 */
export const navigationConfig: NavigationConfig = {
  // Home section - accessible to all authenticated users
  home: {
    label: 'TRANG CHỦ',
    items: [
      {
        href: '/trang-chu',
        label: 'Trang chủ',
        icon: 'Home',
        description: 'Tổng quan hệ thống quản lý báo giá'
      }
    ]
  },

  // Quote Management section - restricted to procurement and admin roles
  quoteManagement: {
    label: 'QUẢN LÝ BÁO GIÁ',
    items: [
      {
        href: '/bao-gia',
        label: 'Cập nhật',
        icon: 'Upload',
        roles: ['ADMIN_*', 'PROCUREMENT_*'],
        description: 'Cập nhật báo giá từ nhà cung cấp'
      },
      {
        href: '/so-sanh',
        label: 'So sánh',
        icon: 'GitCompare',
        roles: ['ADMIN_*', 'PROCUREMENT_*'],
        description: 'So sánh giá giữa các nhà cung cấp'
      },
      {
        href: '/bang-gia',
        label: 'Bảng giá',
        icon: 'FileText',
        roles: ['ADMIN_*', 'PROCUREMENT_*'],
        description: 'Xem và xuất bảng giá'
      }
    ]
  },

  // Administration section - restricted to admin and procurement manager roles
  administration: {
    label: 'QUẢN TRỊ',
    items: [
      {
        href: '/danh-muc/nhan-vien',
        label: 'Nhân viên',
        icon: 'Users',
        roles: ['ADMIN_*', 'PROCUREMENT_MANAGER'],
        description: 'Quản lý nhân viên và phân quyền'
      },
      {
        href: '/danh-muc/bep',
        label: 'Bếp',
        icon: 'Building',
        roles: ['ADMIN_*'],
        description: 'Quản lý danh sách bếp'
      },
      {
        href: '/danh-muc/hang-hoa',
        label: 'Hàng hóa',
        icon: 'Package',
        roles: ['ADMIN_*', 'PROCUREMENT_MANAGER'],
        description: 'Quản lý danh mục hàng hóa'
      },
      {
        href: '/danh-muc/nha-cung-cap',
        label: 'Nhà cung cấp',
        icon: 'Truck',
        roles: ['ADMIN_*', 'PROCUREMENT_MANAGER'],
        description: 'Quản lý nhà cung cấp'
      }
    ]
  }
};

/**
 * Get all navigation sections as an array
 */
export function getNavigationSections(): NavigationSection[] {
  return [
    navigationConfig.home,
    navigationConfig.quoteManagement,
    navigationConfig.administration
  ];
}

/**
 * Get a flat array of all navigation items
 */
export function getAllNavigationItems(): NavigationItem[] {
  return getNavigationSections().flatMap(section => section.items);
}

/**
 * Find a navigation item by href
 */
export function getNavigationItemByHref(href: string): NavigationItem | undefined {
  return getAllNavigationItems().find(item => item.href === href);
}
