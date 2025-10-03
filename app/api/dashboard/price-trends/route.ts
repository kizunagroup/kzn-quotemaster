import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { priceHistory, products, suppliers, teamMembers, teams } from '@/lib/db/schema';
import { eq, sql, and, isNull, desc, asc } from 'drizzle-orm';

/**
 * Price Trends API Route
 *
 * Provides price trend analysis for the home dashboard:
 * - Top products with price increases
 * - Top products with price decreases
 *
 * Authorization: Required - filters data based on user role
 */

export interface ProductTrend {
  productId: number;
  productCode: string;
  productName: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercentage: number;
  supplier: string;
  period: string;
}

export interface PriceTrendsResponse {
  priceIncreases: ProductTrend[];
  priceDecreases: ProductTrend[];
}

export async function GET(request: Request) {
  try {
    // 1. Authorization Check - CRITICAL FIRST STEP
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get user's team membership and role for data filtering
    const userTeamMemberships = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, user.id), isNull(teams.deletedAt)));

    if (userTeamMemberships.length === 0) {
      return NextResponse.json({
        priceIncreases: [],
        priceDecreases: [],
      });
    }

    const userRole = userTeamMemberships[0].role;
    const isAdmin = userRole.startsWith('ADMIN_');

    // 3. Find the two most recent distinct periods with approved prices
    const recentPeriods = await db
      .selectDistinct({ period: priceHistory.period })
      .from(priceHistory)
      .where(eq(priceHistory.priceType, 'approved'))
      .orderBy(desc(priceHistory.period))
      .limit(2);

    if (recentPeriods.length < 2) {
      // Not enough historical data to compare
      return NextResponse.json({
        priceIncreases: [],
        priceDecreases: [],
      });
    }

    const currentPeriod = recentPeriods[0].period;
    const previousPeriod = recentPeriods[1].period;

    // 4. Build the price comparison query with CTE
    const priceTrendsQuery = sql`
      WITH price_comparison AS (
        SELECT
          p.id as product_id,
          p.product_code,
          p.name as product_name,
          s.name as supplier_name,
          current_ph.price::numeric as current_price,
          previous_ph.price::numeric as previous_price,
          (current_ph.price::numeric - previous_ph.price::numeric) as price_change,
          CASE
            WHEN previous_ph.price::numeric > 0
            THEN ((current_ph.price::numeric - previous_ph.price::numeric) / previous_ph.price::numeric * 100)
            ELSE 0
          END as price_change_percentage
        FROM ${products} p
        INNER JOIN ${priceHistory} current_ph ON p.id = current_ph.product_id
          AND current_ph.period = ${currentPeriod}
          AND current_ph.price_type = 'approved'
        INNER JOIN ${priceHistory} previous_ph ON p.id = previous_ph.product_id
          AND previous_ph.period = ${previousPeriod}
          AND previous_ph.price_type = 'approved'
        INNER JOIN ${suppliers} s ON current_ph.supplier_id = s.id
        WHERE p.deleted_at IS NULL
          AND current_ph.price::numeric != previous_ph.price::numeric
      )
      SELECT * FROM price_comparison
      ORDER BY price_change_percentage DESC
    `;

    const allTrends = await db.execute(priceTrendsQuery);

    // 5. Separate increases and decreases, take top 10 of each
    const increases: ProductTrend[] = [];
    const decreases: ProductTrend[] = [];

    for (const row of allTrends.rows) {
      const trend: ProductTrend = {
        productId: Number(row.product_id),
        productCode: String(row.product_code),
        productName: String(row.product_name),
        currentPrice: Number(row.current_price),
        previousPrice: Number(row.previous_price),
        priceChange: Number(row.price_change),
        priceChangePercentage: Number(row.price_change_percentage),
        supplier: String(row.supplier_name),
        period: currentPeriod,
      };

      if (trend.priceChangePercentage > 0) {
        increases.push(trend);
      } else if (trend.priceChangePercentage < 0) {
        decreases.push(trend);
      }
    }

    // Sort decreases by absolute value (most negative first)
    decreases.sort((a, b) => a.priceChangePercentage - b.priceChangePercentage);

    // 6. Return top 10 of each
    const response: PriceTrendsResponse = {
      priceIncreases: increases.slice(0, 10),
      priceDecreases: decreases.slice(0, 10),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching price trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price trends' },
      { status: 500 }
    );
  }
}
