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
import { quotations, suppliers, quoteItems, products } from "@/lib/db/schema";
import { getUser, getUserWithTeams } from "@/lib/db/queries";
import { getUserPermissions } from "@/lib/auth/permissions";
import { quotationQuerySchema } from "@/lib/schemas/quotation.schemas";

export async function GET(request: NextRequest) {
  try {

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
      category: searchParams.get("category") || undefined,
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

    // 4. V3.2: No team-based filtering - centralized purchasing model

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

    // Category filter - filter by quotations that have products in the specified category
    if (params.category && params.category !== "all") {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM quote_items qi
          JOIN products p ON qi.product_id = p.id
          WHERE qi.quotation_id = quotations.id
          AND p.category = ${params.category}
        )`
      );
    }

    // Status filter
    if (params.status && params.status !== "all") {
      conditions.push(eq(quotations.status, params.status));
    }

    // V3.2: No team-based filtering needed - centralized purchasing model

    // 6. Safe column mapping for sorting - supports all table columns
    const getSortColumn = (sortField: string) => {
      // Ensure sortField is defined and is a string
      const field = sortField || "createdAt";

      switch (field) {
        case "quotationId":
          return quotations.quotationId;
        case "period":
          return quotations.period;
        case "region":
          return quotations.region;
        case "quoteDate":
          return quotations.quoteDate;
        case "updateDate":
          return quotations.updateDate;
        case "status":
          return quotations.status;
        case "supplierCode":
          return suppliers.supplierCode;
        case "supplierName":
          return suppliers.name;
        case "itemCount":
          // For itemCount, we'll sort by the subquery result
          return sql`COALESCE((
            SELECT COUNT(*)::integer
            FROM ${quoteItems}
            WHERE ${quoteItems.quotationId} = ${quotations.id}
          ), 0)`;
        case "createdAt":
        default:
          return quotations.createdAt;
      }
    };

    // Safely get sort column and ensure we have valid values
    const sortColumn = getSortColumn(params.sort);
    const sortOrder = params.order || "desc";
    const orderByClause = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    // 7. Execute main query with complex JOINs
    const baseQuery = db
      .select({
        id: quotations.id,
        quotationId: quotations.quotationId,
        period: quotations.period,
        supplierId: quotations.supplierId,
        supplierName: suppliers.name,
        supplierCode: suppliers.supplierCode,
        region: quotations.region,
        // Categories derived from quote items - with null filter
        categories: sql<string[]>`COALESCE((
          SELECT array_agg(DISTINCT ${products.category})
          FROM ${quoteItems}
          JOIN ${products} ON ${quoteItems.productId} = ${products.id}
          WHERE ${quoteItems.quotationId} = ${quotations.id}
            AND ${products.category} IS NOT NULL
            AND ${products.category} != ''
        ), '{}'::text[])`,
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
        .where(and(...conditions)),
    ]);

    // 8. Calculate pagination metadata
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
        category: params.category || null,
        status: params.status,
        sort: params.sort,
        order: params.order,
      },
    });
  } catch (error) {
    console.error("Quotations API Error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách báo giá" },
      { status: 500 }
    );
  }
}
