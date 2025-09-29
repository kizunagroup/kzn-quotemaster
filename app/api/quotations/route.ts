import { NextRequest, NextResponse } from "next/server";
import {
  and,
  eq,
  ilike,
  or,
  inArray,
  desc,
  asc,
  count,
  sql,
  isNull,
} from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import { quotations, suppliers, teams, quoteItems } from "@/lib/db/schema";
import { getUser, getUserWithTeams } from "@/lib/db/queries";
import { getUserPermissions } from "@/lib/auth/permissions";
import { quotationQuerySchema } from "@/lib/schemas/quotation.schemas";

export async function GET(request: NextRequest) {
  try {
    console.log('[API /quotations] - Request received.');

    // 1. Authentication check
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    // 2. Get user permissions and team memberships
    const userWithTeams = await getUserWithTeams(user.id);
    if (!userWithTeams) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin người dùng" },
        { status: 404 }
      );
    }

    const permissions = await getUserPermissions(user.id);
    if (!permissions.canViewQuotes) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem báo giá" },
        { status: 403 }
      );
    }

    // 3. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = quotationQuerySchema.safeParse({
      search: searchParams.get("search") || undefined,
      period: searchParams.get("period") || undefined,
      supplier: searchParams.get("supplier") || searchParams.get("supplierId") || undefined,
      region: searchParams.get("region") || undefined,
      status: searchParams.get("status") || "all",
      sort: searchParams.get("sort") || "createdAt",
      order: searchParams.get("order") || "desc",
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Tham số truy vấn không hợp lệ" },
        { status: 400 }
      );
    }

    const params = queryResult.data;

    // 2. Log parsed parameters
    console.log('[API /quotations] - Parsed Params:', {
      search: params.search,
      period: params.period,
      supplier: params.supplier,
      region: params.region,
      status: params.status,
      sort: params.sort,
      order: params.order,
      page: params.page,
      limit: params.limit
    });

    // 4. Determine user's accessible team IDs for permission-based filtering
    let accessibleTeamIds: number[] = [];
    if (permissions.teamRestricted) {
      accessibleTeamIds = userWithTeams.map((team) => team.teamId);
      if (accessibleTeamIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page: 1, limit: params.limit, total: 0, pages: 0 },
          filters: params,
        });
      }
    }

    // 5. Build where conditions
    const conditions = [sql`${isNull(quotations.createdAt)} = false`]; // Exclude soft-deleted if needed

    // Search filter - across quotation ID, supplier name, and region
    if (params.search?.trim()) {
      const searchTerm = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(quotations.quotationId, searchTerm),
          ilike(suppliers.name, searchTerm),
          ilike(quotations.region, searchTerm)
        )!
      );
    }

    // Period filter
    if (params.period) {
      conditions.push(eq(quotations.period, params.period));
    }

    // Supplier filter (by supplier ID or name)
    if (params.supplier) {
      conditions.push(
        or(
          eq(suppliers.id, parseInt(params.supplier) || 0),
          ilike(suppliers.name, `%${params.supplier}%`)
        )!
      );
    }

    // Region filter
    if (params.region) {
      conditions.push(eq(quotations.region, params.region));
    }


    // Status filter
    if (params.status && params.status !== "all") {
      conditions.push(eq(quotations.status, params.status));
    }

    // Team-based permission filtering
    if (permissions.teamRestricted && accessibleTeamIds.length > 0) {
      conditions.push(inArray(quotations.teamId, accessibleTeamIds));
    }

    // 6. Safe column mapping for sorting
    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case "quotationId":
          return quotations.quotationId;
        case "period":
          return quotations.period;
        case "supplierCode":
          return suppliers.supplierCode;
        case "supplierName":
          return suppliers.name;
        case "region":
          return quotations.region;
        case "category":
          return quotations.category;
        case "quoteDate":
          return quotations.quoteDate;
        case "updateDate":
          return quotations.updateDate;
        case "status":
          return quotations.status;
        case "createdAt":
        default:
          return quotations.createdAt;
      }
    };

    const sortColumn = getSortColumn(params.sort);
    const orderByClause =
      params.order === "desc" ? desc(sortColumn) : asc(sortColumn);

    // 7. Execute main query with complex JOINs
    console.log('[API /quotations] - Executing database query...');

    const baseQuery = db
      .select({
        id: quotations.id,
        quotationId: quotations.quotationId,
        period: quotations.period,
        supplierId: quotations.supplierId,
        supplierName: suppliers.name,
        supplierCode: suppliers.supplierCode,
        teamId: quotations.teamId,
        teamName: teams.name,
        region: quotations.region,
        category: quotations.category,
        status: quotations.status,
        quoteDate: quotations.quoteDate,
        updateDate: quotations.updateDate,
        createdAt: quotations.createdAt,
        updatedAt: quotations.updatedAt,
        // Count of quote items for each quotation
        itemCount: sql<number>`COALESCE((
          SELECT COUNT(*)::integer
          FROM ${quoteItems}
          WHERE ${quoteItems.quotationId} = ${quotations.id}
        ), 0)`,
      })
      .from(quotations)
      .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .leftJoin(teams, eq(quotations.teamId, teams.id))
      .where(and(...conditions))
      .orderBy(orderByClause);

    // 8. Execute queries in parallel for performance
    const offset = (params.page - 1) * params.limit;
    const [data, [{ totalCount }]] = await Promise.all([
      // Main data query with pagination
      baseQuery.limit(params.limit).offset(offset),

      // Total count query for pagination metadata
      db
        .select({ totalCount: count() })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .leftJoin(teams, eq(quotations.teamId, teams.id))
        .where(and(...conditions)),
    ]);

    // 8. Log successful database query completion
    console.log('[API /quotations] - DB query successful, found', data.length, 'records.');

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / params.limit);

    // 10. Return standardized response format
    return NextResponse.json({
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        pages: totalPages, // CRITICAL: Use 'pages' not 'totalPages'
      },
      filters: {
        search: params.search || null,
        period: params.period || null,
        supplier: params.supplier || null,
        region: params.region || null,
        teamId: params.teamId || null,
        status: params.status,
        sort: params.sort,
        order: params.order,
      },
    });
  } catch (error) {
    console.error('[API /quotations] - CRITICAL ERROR:', error);
    console.error('[API /quotations] - Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('[API /quotations] - Error message:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách báo giá" },
      { status: 500 }
    );
  }
}
