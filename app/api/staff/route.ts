import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { users, teamMembers, teams } from '@/lib/db/schema';
import { and, eq, ilike, isNull, asc, desc, sql, or, inArray } from 'drizzle-orm';
import { getUser, getUserWithTeams } from '@/lib/db/queries';

// Exported constants for valid status values
export const VALID_STATUSES = ['all', 'active', 'inactive', 'terminated'] as const;

// Valid sort columns for the users table
const VALID_SORT_COLUMNS = ['name', 'employeeCode', 'email', 'department', 'jobTitle', 'status', 'hireDate', 'createdAt'] as const;

// Valid departments for filtering
const VALID_DEPARTMENTS = ['all', 'ADMIN', 'PROCUREMENT', 'KITCHEN', 'ACCOUNTING', 'OPERATIONS'] as const;

// Input validation schema for query parameters
const staffQuerySchema = z.object({
  search: z.string().nullable().optional(),
  department: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(VALID_DEPARTMENTS)),
  status: z.string().nullable().default('all').transform(val =>
    val === null || val === '' ? 'all' : val
  ).pipe(z.enum(VALID_STATUSES)),
  team: z.string().nullable().optional(),
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

// Staff interface for API response
interface StaffResponse {
  id: number;
  employeeCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  hireDate: Date | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  currentTeams: {
    teamId: number;
    teamName: string;
    role: string;
    joinedAt: Date;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization check - verify user session and staff management permission
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check staff management permission - PURE TEAM-BASED AUTHORIZATION
    const userWithTeams = await getUserWithTeams(user.id);
    let hasStaffManagementPermission = false;

    // Check if user has admin roles that grant staff management permissions
    if (userWithTeams && userWithTeams.teams && userWithTeams.teams.length > 0) {
      const hasAdminRole = userWithTeams.teams.some(tm => {
        const role = tm.role.toUpperCase();
        // Admin roles that grant staff management access
        return role === 'ADMIN_SUPER_ADMIN' ||
               role === 'ADMIN_MANAGER';
      });

      if (hasAdminRole) {
        hasStaffManagementPermission = true;
      }
    }

    if (!hasStaffManagementPermission) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to manage staff' },
        { status: 403 }
      );
    }

    // 3. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = staffQuerySchema.parse({
      search: searchParams.get('search'),
      department: searchParams.get('department'),
      status: searchParams.get('status'),
      team: searchParams.get('team'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    // 4. Build base where conditions for all staff queries
    const baseWhereConditions = [
      isNull(users.deletedAt), // Only non-deleted users
    ];

    // 5. Task 2.2.2: Role-based data filtering (CRITICAL SECURITY REQUIREMENT) - PURE TEAM-BASED RBAC
    let roleBasedConditions: any[] = [];

    // Check if user is super admin based on PURE team-based RBAC
    // Note: We already have userWithTeams from the authorization check above
    let isSuperAdmin = hasStaffManagementPermission; // If user has staff management permission, they are admin

    // Apply role-based restrictions if user is not super admin
    if (!isSuperAdmin) {
      // FIXED: Properly handle users with no teams
      if (userWithTeams && userWithTeams.teams && userWithTeams.teams.length > 0) {
        // User has teams - only see staff from their teams
        const userTeamIds = userWithTeams.teams.map(tm => tm.team.id);

        if (userTeamIds.length > 0) {
          // Use subquery to find users who are members of the same teams
          const teamMemberUserIds = await db
            .select({ userId: teamMembers.userId })
            .from(teamMembers)
            .where(inArray(teamMembers.teamId, userTeamIds));

          const allowedUserIds = teamMemberUserIds.map(tm => tm.userId);

          if (allowedUserIds.length > 0) {
            // Include the user themselves and team members
            allowedUserIds.push(user.id);
            roleBasedConditions.push(inArray(users.id, allowedUserIds));
          } else {
            // If no team members found, user can only see themselves
            roleBasedConditions.push(eq(users.id, user.id));
          }
        } else {
          // User has no team assignments - can only see themselves
          roleBasedConditions.push(eq(users.id, user.id));
        }
      } else {
        // FIXED: User has no team memberships - can only see themselves
        roleBasedConditions.push(eq(users.id, user.id));
      }
    }
    // Super admin users don't get additional role-based restrictions (can see all staff)

    // 6. Apply search filter - search in name, email, and employee code
    if (params.search && params.search.trim() !== '') {
      const searchTerm = `%${params.search.trim()}%`;
      baseWhereConditions.push(
        or(
          ilike(users.name, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.employeeCode, searchTerm)
        )
      );
    }

    // 7. Apply department filter
    if (params.department && params.department !== 'all') {
      baseWhereConditions.push(eq(users.department, params.department));
    }

    // 8. Apply status filter - FIXED: Proper status filtering logic
    if (params.status && params.status !== 'all') {
      // When a specific status is requested, filter by that exact status
      baseWhereConditions.push(eq(users.status, params.status));
    } else if (params.status === 'all') {
      // When status is explicitly 'all', show staff with all statuses (active, inactive, terminated)
      // No additional filter needed - show all statuses
    } else {
      // When no status filter is specified, show active and inactive staff by default (exclude terminated)
      baseWhereConditions.push(inArray(users.status, ['active', 'inactive']));
    }

    // 9. Apply team filter (if specified)
    if (params.team && params.team.trim() !== '') {
      const teamFilter = parseInt(params.team);
      if (!isNaN(teamFilter)) {
        // Find users who are members of the specified team
        const teamMemberUserIds = await db
          .select({ userId: teamMembers.userId })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, teamFilter));

        const teamUserIds = teamMemberUserIds.map(tm => tm.userId);
        if (teamUserIds.length > 0) {
          baseWhereConditions.push(inArray(users.id, teamUserIds));
        } else {
          // No users in this team - return empty result
          baseWhereConditions.push(sql`1 = 0`);
        }
      }
    }

    // 10. Combine base conditions with role-based conditions
    const allWhereConditions = [...baseWhereConditions];
    if (roleBasedConditions.length > 0) {
      allWhereConditions.push(...roleBasedConditions);
    }

    // 11. Configure sorting with proper column mapping
    const offset = (params.page - 1) * params.limit;

    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case 'employeeCode': return users.employeeCode;
        case 'email': return users.email;
        case 'department': return users.department;
        case 'jobTitle': return users.jobTitle;
        case 'status': return users.status;
        case 'hireDate': return users.hireDate;
        case 'createdAt': return users.createdAt;
        case 'name':
        default: return users.name;
      }
    };

    const sortColumn = getSortColumn(params.sort);
    const sortDirection = params.order === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // 12. Execute optimized queries with Promise.all for efficiency
    const [staffData, totalCount] = await Promise.all([
      // Fetch staff data with team assignments
      db
        .select({
          id: users.id,
          employeeCode: users.employeeCode,
          name: users.name,
          email: users.email,
          phone: users.phone,
          jobTitle: users.jobTitle,
          department: users.department,
          hireDate: users.hireDate,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Team assignment info
          teamMemberId: teamMembers.id,
          teamId: teamMembers.teamId,
          teamName: teams.name,
          teamRole: teamMembers.role,
          joinedAt: teamMembers.joinedAt,
        })
        .from(users)
        .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
        .leftJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(allWhereConditions.length > 0 ? and(...allWhereConditions) : undefined)
        .orderBy(sortDirection)
        .limit(params.limit)
        .offset(offset),

      // Get total count for pagination
      db
        .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
        .from(users)
        .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
        .where(allWhereConditions.length > 0 ? and(...allWhereConditions) : undefined)
        .then(result => result[0]?.count || 0)
    ]);

    // 13. Group results by user and collect team assignments
    const staffMap = new Map<number, StaffResponse>();

    staffData.forEach(row => {
      if (!staffMap.has(row.id)) {
        staffMap.set(row.id, {
          id: row.id,
          employeeCode: row.employeeCode,
          name: row.name,
          email: row.email,
          phone: row.phone,
          jobTitle: row.jobTitle,
          department: row.department,
          hireDate: row.hireDate,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          currentTeams: [],
        });
      }

      // Add team assignment if exists
      if (row.teamMemberId && row.teamId && row.teamName) {
        staffMap.get(row.id)!.currentTeams.push({
          teamId: row.teamId,
          teamName: row.teamName,
          role: row.teamRole,
          joinedAt: row.joinedAt,
        });
      }
    });

    // 14. Convert map to array and ensure proper pagination
    const staff = Array.from(staffMap.values());

    // 15. Return structured JSON response
    return NextResponse.json({
      data: staff,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / params.limit),
      },
      filters: {
        search: params.search,
        department: params.department,
        status: params.status,
        team: params.team,
        sort: params.sort,
        order: params.order,
      },
    });

  } catch (error) {
    // 16. Comprehensive error handling
    console.error('Staff API error:', error);

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
        code: 'STAFF_FETCH_FAILED',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}