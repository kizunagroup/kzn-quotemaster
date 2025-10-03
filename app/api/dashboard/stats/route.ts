import { NextResponse } from 'next/server';
import { getDashboardStatsData } from '@/lib/actions/dashboard.actions';

/**
 * Dashboard Statistics API Route
 *
 * Provides KPI metrics for the home dashboard via HTTP endpoint.
 * This route delegates to the centralized business logic function.
 */
export async function GET(request: Request) {
  try {
    const stats = await getDashboardStatsData();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);

    // Check if it's an authorization error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
