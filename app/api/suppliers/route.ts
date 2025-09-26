import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { suppliers } from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { and, ilike, eq, desc, asc, count, isNull, or, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Task 3.2: Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 }
      );
    }

    // Check if user has permission to manage suppliers
    const hasPermission = await checkPermission(user.id, "canManageSuppliers");
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem danh sách nhà cung cấp" },
        { status: 403 }
      );
    }

    // Task 3.3: Parse Query Parameters with Defaults - FIXED TO MATCH TEAMS
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const sort = searchParams.get("sort") || "createdAt"; // ✅ DEFAULT TO createdAt
    const order = searchParams.get("order") || "desc"; // ✅ DEFAULT TO desc
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Validate pagination parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100); // Cap at 100 for performance

    // Validate sort parameters - FIXED TO MATCH TEAMS
    const validSortColumns = [
      "name",
      "supplierCode",
      "contactPerson",
      "phone",
      "email",
      "status",
      "createdAt",
    ];
    const validatedSort = validSortColumns.includes(sort) ? sort : "createdAt"; // ✅ DEFAULT TO createdAt
    const validatedOrder = ["asc", "desc"].includes(order) ? order : "desc"; // ✅ DEFAULT TO desc

    // Task 3.4: Build Where Conditions
    const conditions = [
      // CRITICAL: Exclude soft-deleted records by default
      isNull(suppliers.deletedAt),
    ];

    // Search filtering across name and supplierCode - EXACTLY LIKE TEAMS
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        sql`(LOWER(${suppliers.name}) LIKE LOWER(${searchTerm}) OR LOWER(${suppliers.supplierCode}) LIKE LOWER(${searchTerm}))`
      );
    }

    // Status filtering
    if (status && status !== "all") {
      // Validate status parameter
      const validStatuses = ["active", "inactive"];
      if (validStatuses.includes(status)) {
        conditions.push(eq(suppliers.status, status));
      }
    }

    // Task 3.5: Build Final Where Clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Safe column mapping for sorting - EXACTLY LIKE TEAMS
    const getSortColumn = (sortField: string) => {
      switch (sortField) {
        case 'supplierCode': return suppliers.supplierCode;
        case 'name': return suppliers.name;
        case 'contactPerson': return suppliers.contactPerson;
        case 'phone': return suppliers.phone;
        case 'email': return suppliers.email;
        case 'status': return suppliers.status;
        case 'createdAt': return suppliers.createdAt;
        default: return suppliers.createdAt; // ✅ DEFAULT TO createdAt instead of name
      }
    };

    const sortColumn = getSortColumn(validatedSort);
    const orderByClause = validatedOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    // Task 3.5: Execute Queries (Data + Count in Parallel)
    const [data, [{ totalCount }]] = await Promise.all([
      // Main data query with pagination
      db
        .select({
          id: suppliers.id,
          supplierCode: suppliers.supplierCode,
          name: suppliers.name,
          taxId: suppliers.taxId,
          address: suppliers.address,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
          status: suppliers.status,
          createdAt: suppliers.createdAt,
          updatedAt: suppliers.updatedAt,
        })
        .from(suppliers)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(validatedLimit)
        .offset((validatedPage - 1) * validatedLimit),

      // Count query for pagination
      db.select({ totalCount: count() }).from(suppliers).where(whereClause),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / validatedLimit);

    // Task 3.6: Return Standardized Response - EXACTLY LIKE TEAMS
    return NextResponse.json({
      data,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total: totalCount,
        pages: totalPages, // FIXED: pages instead of totalPages to match teams
      },
      filters: {
        search,
        status,
        sort: validatedSort, // ADDED: Missing filters object like teams
        order: validatedOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      // Log the actual error for debugging but return generic message to user
      console.error("Database error details:", error.message);
    }

    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tải danh sách nhà cung cấp" },
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
