import { KPICards } from '@/components/features/dashboard/kpi-cards';
import { PriceTrends } from '@/components/features/dashboard/price-trends';
import { getDashboardStatsData } from '@/lib/actions/dashboard.actions';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Home Dashboard Page (Trang chủ)
 *
 * Main landing page after authentication, displaying:
 * - Section 1: KPI Cards (Kitchens, Products, Suppliers, Quotations)
 * - Section 2: Price Trends (Top price increases and decreases)
 *
 * This is a React Server Component that directly calls the dashboard action.
 */

// Loading skeleton for KPI cards
function KPICardsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for price trends
function PriceTrendsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function HomePage() {
  // Fetch dashboard statistics directly from server action
  let stats;
  try {
    stats = await getDashboardStatsData();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return empty stats on error
    stats = {
      totalKitchens: 0,
      totalProducts: 0,
      totalSuppliers: 0,
      totalQuotations: 0,
    };
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trang chủ</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tổng quan hệ thống quản lý báo giá
        </p>
      </div>

      {/* Section 1: KPI Cards */}
      <Suspense fallback={<KPICardsLoading />}>
        <KPICards stats={stats} />
      </Suspense>

      {/* Section 2: Price Trends */}
      <Suspense fallback={<PriceTrendsLoading />}>
        <PriceTrends />
      </Suspense>
    </div>
  );
}
