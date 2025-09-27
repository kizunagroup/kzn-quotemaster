import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { db } from "@/lib/db/drizzle";
import { suppliers } from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { supplierQuerySchema } from '@/lib/schemas/supplier.schemas';
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

    // Parse and validate query parameters using the schema - EXACTLY LIKE TEAMS
    const { searchParams } = new URL(request.url);
    const params = supplierQuerySchema.parse({
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    // Task 3.4: Build Where Conditions
    const conditions = [
      // CRITICAL: Exclude soft-deleted records by default
      isNull(suppliers.deletedAt),
    ];

    // Search filtering across name and supplierCode - EXACTLY LIKE TEAMS
    if (params.search && params.search.trim()) {
      const searchTerm = `%${params.search.trim()}%`;
      conditions.push(
        sql`(LOWER(${suppliers.name}) LIKE LOWER(${searchTerm}) OR LOWER(${suppliers.supplierCode}) LIKE LOWER(${searchTerm}))`
      );
    }

    // Status filtering
    if (params.status && params.status !== "all") {
      conditions.push(eq(suppliers.status, params.status));
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
        default: return suppliers.createdAt;
      }
    };

    const sortColumn = getSortColumn(params.sort);
    const orderByClause = params.order === "desc" ? desc(sortColumn) : asc(sortColumn);

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
        .limit(params.limit)
        .offset((params.page - 1) * params.limit),

      // Count query for pagination
      db.select({ totalCount: count() }).from(suppliers).where(whereClause),
    ]);

    // Task 3.6: Return Standardized Response - EXACTLY LIKE TEAMS
    return NextResponse.json({
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / params.limit),
      },
      filters: {
        search: params.search,
        status: params.status,
        sort: params.sort,
        order: params.order,
      },
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);

    // Handle Zod validation errors - EXACTLY LIKE TEAMS
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
        code: 'SUPPLIERS_FETCH_FAILED',
        timestamp: new Date().toISOString()
      },
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
