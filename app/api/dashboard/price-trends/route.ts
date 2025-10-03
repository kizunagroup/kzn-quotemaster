import { NextResponse } from 'next/server';
import { getUser, getUserWithTeams } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { priceHistory, products, suppliers } from '@/lib/db/schema';
import { eq, sql, and, isNull, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/lib/auth/permissions';

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

    // 2. Get user permissions using centralized permission utility (SINGLE SOURCE OF TRUTH)
    const permissions = await getUserPermissions(user.id);

    // 3. Determine data scope based on teamRestricted flag
    let regionFilter: string | null = null;

    if (permissions.teamRestricted) {
      // Restricted users: Get their primary team's region for filtering
      const userWithTeams = await getUserWithTeams(user.id);

      if (!userWithTeams || userWithTeams.teams.length === 0) {
        // User has no team assignment - return empty data
        return NextResponse.json({
          priceIncreases: [],
          priceDecreases: [],
        });
      }

      // Use the region from the user's first (primary) team
      regionFilter = userWithTeams.teams[0].team.region;

      // If no region is assigned to their team, return empty data
      if (!regionFilter) {
        return NextResponse.json({
          priceIncreases: [],
          priceDecreases: [],
        });
      }
    }
    // If teamRestricted is false (Admin/Procurement roles), regionFilter stays null = see all data

    // 4. Find the two most recent distinct periods with approved prices
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

    // 5. Build the price comparison query with CTE
    //
    // BUSINESS LOGIC EXPLANATION:
    // -------------------------------
    // For each product, we want to compare the BEST (minimum) approved price
    // from the most recent period against the BEST approved price from the
    // immediately preceding period.
    //
    // This approach helps identify:
    // - Products where the best available price has increased (bad for buyers)
    // - Products where the best available price has decreased (good for buyers)
    //
    // QUERY STRUCTURE:
    // 1. First CTE (current_best_prices): Find the minimum approved price for
    //    each product in the current period, along with one supplier offering that price
    // 2. Second CTE (previous_best_prices): Find the minimum approved price for
    //    each product in the previous period
    // 3. Main query: Join these CTEs to calculate price changes and percentage changes
    //
    // RBAC DATA SCOPING (CRITICAL):
    // - If regionFilter is set (teamRestricted = true): Filter products by region
    // - If regionFilter is null (teamRestricted = false): No region filter = global view
    //
    const priceTrendsQuery = regionFilter
      ? sql`
          WITH current_best_prices AS (
            -- Get the best (minimum) approved price for each product in the current period
            -- FILTERED BY REGION for restricted users
            SELECT DISTINCT ON (ph.product_id)
              ph.product_id,
              ph.price::numeric as best_price,
              s.name as supplier_name
            FROM ${priceHistory} ph
            INNER JOIN ${suppliers} s ON ph.supplier_id = s.id
            INNER JOIN ${products} p_filter ON ph.product_id = p_filter.id
            WHERE ph.period = ${currentPeriod}
              AND ph.price_type = 'approved'
              AND p_filter.region = ${regionFilter}
              AND p_filter.deleted_at IS NULL
            ORDER BY ph.product_id, ph.price::numeric ASC, s.name ASC
          ),
          previous_best_prices AS (
            -- Get the best (minimum) approved price for each product in the previous period
            -- FILTERED BY REGION for restricted users
            SELECT DISTINCT ON (ph.product_id)
              ph.product_id,
              ph.price::numeric as best_price
            FROM ${priceHistory} ph
            INNER JOIN ${products} p_filter ON ph.product_id = p_filter.id
            WHERE ph.period = ${previousPeriod}
              AND ph.price_type = 'approved'
              AND p_filter.region = ${regionFilter}
              AND p_filter.deleted_at IS NULL
            ORDER BY ph.product_id, ph.price::numeric ASC
          ),
          price_comparison AS (
            -- Compare current best price vs previous best price for each product
            SELECT
              p.id as product_id,
              p.product_code,
              p.name as product_name,
              cbp.supplier_name,
              cbp.best_price as current_price,
              pbp.best_price as previous_price,
              (cbp.best_price - pbp.best_price) as price_change,
              -- Calculate percentage change, avoiding division by zero
              CASE
                WHEN pbp.best_price > 0
                THEN ((cbp.best_price - pbp.best_price) / pbp.best_price * 100)
                ELSE 0
              END as price_change_percentage
            FROM ${products} p
            INNER JOIN current_best_prices cbp ON p.id = cbp.product_id
            INNER JOIN previous_best_prices pbp ON p.id = pbp.product_id
            WHERE p.deleted_at IS NULL
              AND p.region = ${regionFilter}
              -- Only include products where the price has actually changed
              AND cbp.best_price != pbp.best_price
          )
          SELECT * FROM price_comparison
          ORDER BY price_change_percentage DESC
        `
      : sql`
          WITH current_best_prices AS (
            -- Get the best (minimum) approved price for each product in the current period
            -- NO REGION FILTER for unrestricted users (Admin/Procurement)
            SELECT DISTINCT ON (ph.product_id)
              ph.product_id,
              ph.price::numeric as best_price,
              s.name as supplier_name
            FROM ${priceHistory} ph
            INNER JOIN ${suppliers} s ON ph.supplier_id = s.id
            WHERE ph.period = ${currentPeriod}
              AND ph.price_type = 'approved'
            ORDER BY ph.product_id, ph.price::numeric ASC, s.name ASC
          ),
          previous_best_prices AS (
            -- Get the best (minimum) approved price for each product in the previous period
            -- NO REGION FILTER for unrestricted users (Admin/Procurement)
            SELECT DISTINCT ON (ph.product_id)
              ph.product_id,
              ph.price::numeric as best_price
            FROM ${priceHistory} ph
            WHERE ph.period = ${previousPeriod}
              AND ph.price_type = 'approved'
            ORDER BY ph.product_id, ph.price::numeric ASC
          ),
          price_comparison AS (
            -- Compare current best price vs previous best price for each product
            SELECT
              p.id as product_id,
              p.product_code,
              p.name as product_name,
              cbp.supplier_name,
              cbp.best_price as current_price,
              pbp.best_price as previous_price,
              (cbp.best_price - pbp.best_price) as price_change,
              -- Calculate percentage change, avoiding division by zero
              CASE
                WHEN pbp.best_price > 0
                THEN ((cbp.best_price - pbp.best_price) / pbp.best_price * 100)
                ELSE 0
              END as price_change_percentage
            FROM ${products} p
            INNER JOIN current_best_prices cbp ON p.id = cbp.product_id
            INNER JOIN previous_best_prices pbp ON p.id = pbp.product_id
            WHERE p.deleted_at IS NULL
              -- Only include products where the price has actually changed
              AND cbp.best_price != pbp.best_price
          )
          SELECT * FROM price_comparison
          ORDER BY price_change_percentage DESC
        `;

    const allTrends = await db.execute(priceTrendsQuery);

    // 6. Process query results and separate into increases vs decreases
    //
    // PROCESSING LOGIC:
    // -----------------
    // The query returns all products sorted by price_change_percentage (DESC),
    // so positive changes (increases) come first, then negative changes (decreases).
    //
    // We separate them into two arrays:
    // - increases: Products where best price went UP (positive percentage)
    // - decreases: Products where best price went DOWN (negative percentage)
    //
    const increases: ProductTrend[] = [];
    const decreases: ProductTrend[] = [];

    for (const row of allTrends) {
      // Transform database row into typed ProductTrend object
      // CRITICAL: Ensure proper numeric conversion from PostgreSQL numeric type
      const priceChangePercentage = parseFloat(String(row.price_change_percentage));

      const trend: ProductTrend = {
        productId: Number(row.product_id),
        productCode: String(row.product_code),
        productName: String(row.product_name),
        currentPrice: parseFloat(String(row.current_price)),
        previousPrice: parseFloat(String(row.previous_price)),
        priceChange: parseFloat(String(row.price_change)),
        priceChangePercentage: priceChangePercentage,
        supplier: String(row.supplier_name), // Supplier offering current best price
        period: currentPeriod,
      };

      // Classify as increase or decrease based on percentage change sign
      // BUG FIX: Use explicit comparison to handle floating point precision
      if (priceChangePercentage > 0) {
        increases.push(trend); // Price went up (bad for buyers)
      } else if (priceChangePercentage < 0) {
        decreases.push(trend); // Price went down (good for buyers)
      }
      // Note: We skip items with 0% change (already filtered in WHERE clause)
    }

    // 7. Sort and limit results
    //
    // SORTING LOGIC:
    // --------------
    // - Increases are already sorted DESC by the query (biggest increases first)
    // - Decreases need to be re-sorted ASC to show biggest decreases first
    //   (most negative percentages first)
    //
    decreases.sort((a, b) => a.priceChangePercentage - b.priceChangePercentage);

    // 8. Return top 10 of each category for dashboard display
    const response: PriceTrendsResponse = {
      priceIncreases: increases.slice(0, 10), // Top 10 biggest price increases
      priceDecreases: decreases.slice(0, 10), // Top 10 biggest price decreases
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
