import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { teams, users } from '@/lib/db/schema';
import { and, eq, ilike, isNull, asc, desc, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

// Constants for valid status values
const VALID_STATUSES = ['all', 'active', 'inactive'] as const;

// Valid sort columns for the teams table
const VALID_SORT_COLUMNS = ['name', 'kitchenCode', 'region', 'status', 'createdAt', 'updatedAt'] as const;

// Input validation schema for query parameters
const kitchensQuerySchema = z.object({
  search: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  status: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(VALID_STATUSES)),
  sort: z.string().nullable().default('name').transform(val =>
    val === null || val === '' ? 'name' : val
  ).pipe(z.enum(VALID_SORT_COLUMNS)),
  order: z.string().nullable().default('asc').transform(val =>
    val === null || val === '' ? 'asc' : val
  ).pipe(z.enum(['asc', 'desc'])),
  page: z.string().nullable().default('1').transform(val =>
    val === null || val === '' ? '1' : val
  ).pipe(z.coerce.number().min(1)),
  limit: z.string().nullable().default('10').transform(val =>
    val === null || val === '' ? '10' : val
  ).pipe(z.coerce.number().min(1).max(100)),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization check - verify user session
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = kitchensQuerySchema.parse({
      search: searchParams.get('search'),
      region: searchParams.get('region'),
      status: searchParams.get('status'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    // 3. Build optimized database query with filters
    const whereConditions = [
      eq(teams.teamType, 'KITCHEN'), // Only fetch kitchen teams
    ];

    // Search filter - search in kitchen name and kitchen code
    if (params.search && params.search.trim() !== '') {
      const searchTerm = `%${params.search.trim()}%`;
      whereConditions.push(
        sql`(LOWER(${teams.name}) LIKE LOWER(${searchTerm}) OR LOWER(${teams.kitchenCode}) LIKE LOWER(${searchTerm}))`
      );
    }

    // Region filter
    if (params.region && params.region !== 'all') {
      whereConditions.push(eq(teams.region, params.region));
    }

    // Status filter (active/inactive based on deletedAt)
    if (params.status === 'active') {
      whereConditions.push(isNull(teams.deletedAt));
    } else if (params.status === 'inactive') {
      whereConditions.push(sql`${teams.deletedAt} IS NOT NULL`);
    }
    // For 'all' status, we don't add any deletedAt filter

    // 4. Configure sorting with proper column mapping
    const offset = (params.page - 1) * params.limit;

    // Safe column mapping for sorting
    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case 'kitchenCode': return teams.kitchenCode;
        case 'region': return teams.region;
        case 'status': return teams.status;
        case 'createdAt': return teams.createdAt;
        case 'updatedAt': return teams.updatedAt;
        case 'name':
        default: return teams.name;
      }
    };

    const sortColumn = getSortColumn(params.sort);
    const sortDirection = params.order === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // 5. Execute optimized queries with Promise.all for efficiency
    const [kitchens, totalCount] = await Promise.all([
      // Fetch paginated kitchen data with manager information
      db
        .select({
          id: teams.id,
          kitchenCode: teams.kitchenCode,
          name: teams.name,
          region: teams.region,
          address: teams.address,
          managerId: teams.managerId,
          // Manager information from joined users table
          managerName: users.name,
          managerEmail: users.email,
          teamType: teams.teamType,
          status: teams.status,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
          deletedAt: teams.deletedAt,
        })
        .from(teams)
        .leftJoin(users, eq(teams.managerId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(sortDirection)
        .limit(params.limit)
        .offset(offset),

      // Get total count for pagination
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(teams)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .then(result => result[0]?.count || 0)
    ]);

    // 6. Return structured JSON response
    return NextResponse.json({
      data: kitchens,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / params.limit),
      },
      filters: {
        search: params.search,
        region: params.region,
        status: params.status,
        sort: params.sort,
        order: params.order,
      },
    });

  } catch (error) {
    // 7. Comprehensive error handling
    console.error('Kitchen API error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        {
          error: 'Database error',
          code: 'DATABASE_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'KITCHEN_FETCH_FAILED',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}