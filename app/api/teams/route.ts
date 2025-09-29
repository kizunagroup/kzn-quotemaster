import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { teams, users } from '@/lib/db/schema';
import { and, eq, ilike, isNull, asc, desc, sql, inArray } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { teamQuerySchema } from '@/lib/schemas/team.schemas';

// Constants for valid status values
const VALID_STATUSES = ['all', 'active', 'inactive'] as const;

// Valid team types for filtering
const VALID_TEAM_TYPES = ['all', 'KITCHEN', 'OFFICE'] as const;

// Valid sort columns for the teams table (updated for generic team management)
const VALID_SORT_COLUMNS = ['name', 'teamCode', 'region', 'teamType', 'status', 'createdAt', 'updatedAt'] as const;

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

    // 2. Parse and validate query parameters using the updated schema
    const { searchParams } = new URL(request.url);
    const params = teamQuerySchema.parse({
      search: searchParams.get('search'),
      region: searchParams.get('region'),
      status: searchParams.get('status'),
      teamType: searchParams.get('teamType'), // NEW: Team type filter
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    // 3. Build optimized database query with filters
    const whereConditions = [];

    // NEW: Team type filter (default to all team types)
    if (params.teamType && params.teamType !== 'all') {
      whereConditions.push(eq(teams.teamType, params.teamType));
    }
    // If 'all' or not specified, fetch all team types (KITCHEN and OFFICE)

    // Search filter - search in team name and team code
    if (params.search && params.search.trim() !== '') {
      const searchTerm = `%${params.search.trim()}%`;
      whereConditions.push(
        sql`(LOWER(${teams.name}) LIKE LOWER(${searchTerm}) OR LOWER(${teams.teamCode}) LIKE LOWER(${searchTerm}))`
      );
    }

    // Region filter
    if (params.region && params.region !== 'all') {
      whereConditions.push(eq(teams.region, params.region));
    }

    // Status filter (active/inactive based on status column and deletedAt)
    if (params.status === 'active') {
      whereConditions.push(
        and(
          eq(teams.status, 'active'),
          isNull(teams.deletedAt)
        )
      );
    } else if (params.status === 'inactive') {
      whereConditions.push(
        sql`(${teams.status} = 'inactive' OR ${teams.deletedAt} IS NOT NULL)`
      );
    }
    // For 'all' status, we don't add any status filter

    // 4. Configure sorting with proper column mapping
    const offset = (params.page - 1) * params.limit;

    // Safe column mapping for sorting (updated for team management)
    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case 'teamCode': return teams.teamCode;
        case 'region': return teams.region;
        case 'teamType': return teams.teamType;
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
    const [teamsData, totalCount] = await Promise.all([
      // Fetch paginated team data with manager information
      db
        .select({
          id: teams.id,
          teamCode: teams.teamCode, // UPDATED: teamCode instead of kitchenCode
          name: teams.name,
          region: teams.region,
          address: teams.address,
          managerId: teams.managerId,
          // Manager information from joined users table
          managerName: users.name,
          managerEmail: users.email,
          teamType: teams.teamType, // INCLUDED: Team type in response
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
      data: teamsData,
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
        teamType: params.teamType, // NEW: Include team type in response
        sort: params.sort,
        order: params.order,
      },
    });

  } catch (error) {
    // 7. Comprehensive error handling
    console.error('Teams API error:', error);

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
        code: 'TEAMS_FETCH_FAILED',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}