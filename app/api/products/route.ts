import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { and, ilike, eq, desc, asc, count, isNull, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    // Check if user has permission to view products
    const hasPermission = await checkPermission(user.id, "canViewProducts");
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem danh sách hàng hóa" },
        { status: 403 }
      );
    }

    // 2. Parse Query Parameters with Defaults
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const sort = searchParams.get("sort") || "createdAt"; // DEFAULT TO createdAt
    const order = searchParams.get("order") || "desc"; // DEFAULT TO desc
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100 for performance

    // Validate sort parameters
    const validSortColumns = [
      "productCode",
      "name",
      "unit",
      "category",
      "basePrice",
      "status",
      "createdAt",
    ];
    const validatedSort = validSortColumns.includes(sort) ? sort : "createdAt"; // DEFAULT TO createdAt
    const validatedOrder = ["asc", "desc"].includes(order) ? order : "desc"; // DEFAULT TO desc

    // 3. Build Where Conditions
    const conditions = [
      // CRITICAL: Exclude soft-deleted records by default
      isNull(products.deletedAt),
    ];

    // Search filtering across name and productCode
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        sql`(LOWER(${products.name}) LIKE LOWER(${searchTerm}) OR LOWER(${products.productCode}) LIKE LOWER(${searchTerm}))`
      );
    }

    // Category filtering
    if (category && category !== "all") {
      conditions.push(eq(products.category, category));
    }

    // Status filtering
    if (status && status !== "all") {
      // Validate status parameter
      const validStatuses = ["active", "inactive"];
      if (validStatuses.includes(status)) {
        conditions.push(eq(products.status, status));
      }
    }

    // 4. Build Final Where Clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Safe column mapping for sorting
    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case 'productCode': return products.productCode;
        case 'name': return products.name;
        case 'unit': return products.unit;
        case 'category': return products.category;
        case 'basePrice': return products.basePrice;
        case 'status': return products.status;
        case 'createdAt': return products.createdAt;
        default: return products.createdAt; // DEFAULT TO createdAt
      }
    };

    const sortColumn = getSortColumn(validatedSort);
    const orderByClause = validatedOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    // 5. Execute Queries (Data + Count in Parallel)
    const [data, [{ totalCount }]] = await Promise.all([
      // Main data query with pagination
      db
        .select({
          id: products.id,
          productCode: products.productCode,
          name: products.name,
          specification: products.specification,
          unit: products.unit,
          category: products.category,
          basePrice: products.basePrice,
          baseQuantity: products.baseQuantity,
          status: products.status,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(validatedLimit)
        .offset((validatedPage - 1) * validatedLimit),

      // Count query for pagination
      db.select({ totalCount: count() }).from(products).where(whereClause),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / validatedLimit);

    // 6. Return Standardized Response
    return NextResponse.json({
      data,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: totalCount,
        pages: totalPages, // Use 'pages' instead of 'totalPages' to match pattern
      },
      filters: {
        search,
        category,
        status,
        sort: validatedSort,
        order: validatedOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      // Log the actual error for debugging but return generic message to user
      console.error("Database error details:", error.message);
    }

    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách hàng hóa" },
      { status: 500 }
    );
  }
}

// Handle unsupported HTTP methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}