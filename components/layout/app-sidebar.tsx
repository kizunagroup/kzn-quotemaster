'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useSWR, { mutate } from 'swr';
import { User } from '@/lib/db/schema';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import {
  Home,
  Upload,
  GitCompare,
  FileText,
  Users,
  Building,
  Package,
  Truck,
  Settings,
  LogOut,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import {
  navigationConfig,
  getNavigationSections,
  NavigationSection,
  NavigationItem,
} from '@/lib/config/navigation';
import { filterNavigationSections } from '@/lib/permissions/navigation';

/**
 * App Sidebar Component
 *
 * Main navigation sidebar with Vietnamese labels and role-based visibility.
 * Features:
 * - Company logo at top
 * - Grouped menu sections (TRANG CHỦ, QUẢN LÝ BÁO GIÁ, QUẢN TRỊ)
 * - Active route highlighting
 * - User profile section at bottom
 * - Role-based menu filtering
 */

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Icon mapping for navigation items
const iconMap: Record<string, LucideIcon> = {
  Home,
  Upload,
  GitCompare,
  FileText,
  Users,
  Building,
  Package,
  Truck,
};

interface NavItemProps {
  item: NavigationItem;
  isActive: boolean;
}

function NavItem({ item, isActive }: NavItemProps) {
  const Icon = iconMap[item.icon] || Home;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-orange-50 text-orange-600'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      )}
      title={item.description}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'text-orange-600' : 'text-gray-500')} />
      <span>{item.label}</span>
    </Link>
  );
}

interface NavSectionProps {
  section: NavigationSection;
  currentPath: string;
}

function NavSection({ section, currentPath }: NavSectionProps) {
  // Don't show section header for "TRANG CHỦ"
  const showHeader = section.label !== 'TRANG CHỦ';

  return (
    <div className="space-y-1">
      {showHeader && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {section.label}
        </h3>
      )}
      {section.items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={currentPath === item.href || currentPath.startsWith(item.href + '/')}
        />
      ))}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSWR<User>('/api/user', fetcher);

  // Get user's role from team membership
  // Note: For now, we'll use a simplified approach
  // In production, this should fetch the user's role from team_members table
  const userRole = user ? 'ADMIN_SUPER_ADMIN' : null; // TODO: Get actual role from team_members

  // Filter navigation sections based on user role
  const allSections = getNavigationSections();
  const visibleSections = filterNavigationSections(allSections, userRole);

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.name || user.email || 'User';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/sign-in');
  }

  return (
    <div className="flex h-full flex-col border-r bg-white">
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-center px-6">
        <Link href="/trang-chu" className="block">
          <div className="relative h-10 w-32">
            <Image
              src="/logo.png"
              alt="QuoteMaster Logo"
              fill
              className="object-contain object-center"
            />
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-4 py-6 px-3 overflow-y-auto">
        {visibleSections.map((section, index) => (
          <div key={section.label}>
            {index > 0 && <Separator className="my-3" />}
            <NavSection section={section} currentPath={pathname} />
          </div>
        ))}
      </nav>

      {/* User Profile Section with Dropdown Menu */}
      <div className="border-t p-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage alt={getUserDisplayName()} />
                  <AvatarFallback className="bg-orange-100 text-orange-600 text-sm font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Tài khoản của tôi</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-2 bg-gray-200 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
