'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Package, Truck, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

/**
 * KPI Cards Component for Dashboard
 *
 * Displays key performance indicators in a responsive grid:
 * - Total Kitchens (Bếp)
 * - Total Products (Hàng hóa)
 * - Total Suppliers (Nhà cung cấp)
 * - Total Quotations (Báo giá)
 */

export interface DashboardStats {
  totalKitchens: number;
  totalProducts: number;
  totalSuppliers: number;
  totalQuotations: number;
}

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function KPICard({ title, value, icon: Icon, iconColor, bgColor, trend }: KPICardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {value.toLocaleString('vi-VN')}
        </div>
        {trend && (
          <div className="flex items-center mt-2 text-sm">
            {trend.isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-gray-500 ml-1">so với tháng trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface KPICardsProps {
  stats: DashboardStats;
}

export function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Bếp"
        value={stats.totalKitchens}
        icon={Building}
        iconColor="text-orange-600"
        bgColor="bg-orange-50"
      />
      <KPICard
        title="Hàng hóa"
        value={stats.totalProducts}
        icon={Package}
        iconColor="text-blue-600"
        bgColor="bg-blue-50"
      />
      <KPICard
        title="Nhà cung cấp"
        value={stats.totalSuppliers}
        icon={Truck}
        iconColor="text-green-600"
        bgColor="bg-green-50"
      />
      <KPICard
        title="Báo giá"
        value={stats.totalQuotations}
        icon={FileText}
        iconColor="text-purple-600"
        bgColor="bg-purple-50"
      />
    </div>
  );
}
