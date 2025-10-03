"use server";

import { z } from "zod";
import ExcelJS from "exceljs";
import { db } from "@/lib/db/drizzle";
import {
  quotations,
  quoteItems,
  suppliers,
  products,
  teams,
  teamMembers,
  supplierServiceScopes,
  type Quotation,
  type QuoteItem,
  type Supplier,
  type Product,
  type Team
} from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { eq, and, inArray, desc, sql, isNull } from "drizzle-orm";
import {
  calculatePriceListMatrix,
  type PriceItem
} from "@/lib/utils/price-calculation";
import {
  GetAvailablePeriodsSchema,
  GetPriceListMatrixSchema,
  type PeriodInfo,
  type PriceListMatrixData,
} from "@/lib/types/price-list.types";

// ==================== AUTHORIZATION HELPERS ====================

async function checkTeamAccess(teamId: number) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để xem bảng giá");
  }

  // TODO: Implement proper team access checking
  // Should verify that the user belongs to the specified team or has appropriate permissions
  // For now, assume all authenticated users can access any team's price list

  return user;
}

// ==================== USER ACCESSIBLE REGIONS ====================

/**
 * Get list of regions that the current user can access
 * Returns unique regions from KITCHEN-type teams based on user's role
 *
 * Permission Logic:
 * - Admin users (department = 'ADMIN'): Can access ALL regions
 * - Other users: Can only access regions of kitchens they are members of
 */
export async function getUserAccessibleRegions(): Promise<string[]> {
  try {
    const user = await getUser();

    if (!user) {
      throw new Error("Unauthorized: Bạn cần đăng nhập để xem danh sách khu vực");
    }

    console.log("[getUserAccessibleRegions] User ID:", user.id);
    console.log("[getUserAccessibleRegions] User Department:", user.department);

    const isAdmin = user.department === 'ADMIN';
    console.log("[getUserAccessibleRegions] Is Admin:", isAdmin);

    let regions;

    if (isAdmin) {
      // Admin: get all distinct regions from kitchens
      console.log("[getUserAccessibleRegions] Fetching all regions for admin user");
      regions = await db
        .selectDistinct({ region: teams.region })
        .from(teams)
        .where(
          and(
            eq(teams.teamType, 'KITCHEN'),
            isNull(teams.deletedAt),
            sql`${teams.region} IS NOT NULL AND ${teams.region} != ''`
          )
        )
        .orderBy(teams.region);
    } else {
      // Regular user: get regions only from their assigned kitchens
      console.log("[getUserAccessibleRegions] Fetching regions from user's kitchens");
      regions = await db
        .selectDistinct({ region: teams.region })
        .from(teams)
        .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teams.teamType, 'KITCHEN'),
            isNull(teams.deletedAt),
            sql`${teams.region} IS NOT NULL AND ${teams.region} != ''`
          )
        )
        .orderBy(teams.region);
    }

    const regionList = regions.map(r => r.region).filter((r): r is string => r !== null && r !== '');

    console.log("[getUserAccessibleRegions] Found regions:", regionList);

    return regionList;

  } catch (error) {
    console.error("[getUserAccessibleRegions] Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải danh sách khu vực"
    );
  }
}

// ==================== USER ACCESSIBLE KITCHENS ====================

/**
 * Get list of kitchens that the current user can access
 * Returns KITCHEN-type teams based on user's role and team membership
 * Optionally filtered by region
 *
 * Permission Logic:
 * - Admin users (department = 'ADMIN'): Can access ALL kitchens
 * - Other users: Can only access kitchens they are a member of
 */
export async function getUserAccessibleKitchens(region?: string): Promise<Array<{
  id: number;
  name: string;
  kitchenCode: string;
  region: string;
  status: string;
}>> {
  try {
    const user = await getUser();

    if (!user) {
      throw new Error("Unauthorized: Bạn cần đăng nhập để xem danh sách bếp");
    }

    console.log("[getUserAccessibleKitchens] User ID:", user.id);
    console.log("[getUserAccessibleKitchens] User Department:", user.department);

    // Check if user is an admin - admins can see all kitchens
    const isAdmin = user.department === 'ADMIN';
    console.log("[getUserAccessibleKitchens] Is Admin:", isAdmin);

    let kitchens;

    if (isAdmin) {
      // Admins can access ALL kitchens
      console.log("[getUserAccessibleKitchens] Fetching all kitchens for admin user");

      // Build where conditions
      const whereConditions = [
        eq(teams.teamType, 'KITCHEN'),
        isNull(teams.deletedAt)
      ];

      // Add region filter if provided
      if (region) {
        whereConditions.push(eq(teams.region, region));
        console.log("[getUserAccessibleKitchens] Filtering by region:", region);
      }

      kitchens = await db
        .select({
          id: teams.id,
          name: teams.name,
          teamCode: teams.teamCode,
          region: teams.region,
          status: teams.status,
        })
        .from(teams)
        .where(and(...whereConditions))
        .orderBy(teams.name);
    } else {
      // Non-admin users can only access kitchens they are a member of
      console.log("[getUserAccessibleKitchens] Fetching kitchens where user is a member");

      // Build where conditions
      const whereConditions = [
        eq(teamMembers.userId, user.id),
        eq(teams.teamType, 'KITCHEN'),
        isNull(teams.deletedAt)
      ];

      // Add region filter if provided
      if (region) {
        whereConditions.push(eq(teams.region, region));
        console.log("[getUserAccessibleKitchens] Filtering by region:", region);
      }

      kitchens = await db
        .select({
          id: teams.id,
          name: teams.name,
          teamCode: teams.teamCode,
          region: teams.region,
          status: teams.status,
        })
        .from(teams)
        .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
        .where(and(...whereConditions))
        .orderBy(teams.name);
    }

    console.log("[getUserAccessibleKitchens] Found kitchens count:", kitchens.length);

    const result = kitchens.map(k => ({
      id: k.id,
      name: k.name,
      kitchenCode: k.teamCode || '',
      region: k.region || '',
      status: k.status,
    }));

    console.log("[getUserAccessibleKitchens] Returning kitchens:", result);

    return result;

  } catch (error) {
    console.error("[getUserAccessibleKitchens] Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải danh sách bếp"
    );
  }
}

// ==================== MAIN ACTIONS ====================

/**
 * Get available periods for a specific team with smart filtering
 * Only returns periods that have at least one approved quotation applicable to the team
 */
export async function getAvailablePeriodsForTeam(
  data: z.infer<typeof GetAvailablePeriodsSchema>
): Promise<PeriodInfo[]> {
  try {
    // Validate input
    const validatedData = GetAvailablePeriodsSchema.parse(data);
    const { teamId } = validatedData;

    // Authorization check
    await checkTeamAccess(teamId);

    // Get team information (specifically the region)
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        region: teams.region,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      throw new Error("Không tìm thấy thông tin đội/bếp");
    }

    if (!team.region) {
      throw new Error("Đội/bếp chưa được thiết lập khu vực");
    }

    // CORE LOGIC: Find periods with approved quotations applicable to this team
    // This implements the "smart filter" by checking:
    // 1. Quotations must be approved
    // 2. Quotations must be for the team's region
    // 3. Quotations must be from suppliers that can service this team
    const availablePeriods = await db
      .select({
        period: quotations.period,
        approvedQuotations: sql<number>`COUNT(DISTINCT ${quotations.id})`,
        availableSuppliers: sql<number>`COUNT(DISTINCT ${quotations.supplierId})`,
        totalProducts: sql<number>`COUNT(DISTINCT ${quoteItems.productId})`,
        lastUpdated: sql<Date>`MAX(${quotations.updatedAt})`,
      })
      .from(quotations)
      .innerJoin(quoteItems, eq(quotations.id, quoteItems.quotationId))
      .innerJoin(supplierServiceScopes,
        and(
          eq(quotations.supplierId, supplierServiceScopes.supplierId),
          eq(supplierServiceScopes.teamId, teamId),
          eq(supplierServiceScopes.isActive, true)
        )
      )
      .where(
        and(
          eq(quotations.status, 'approved'),
          eq(quotations.region, team.region)
        )
      )
      .groupBy(quotations.period)
      .orderBy(desc(quotations.period));

    return availablePeriods;

  } catch (error) {
    console.error("Error in getAvailablePeriodsForTeam:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải danh sách kỳ báo giá"
    );
  }
}

/**
 * Get price list matrix for a specific team and period
 * Implements V3.2 logic for team-specific price display
 */
export async function getPriceListMatrix(
  data: z.infer<typeof GetPriceListMatrixSchema>
): Promise<PriceListMatrixData> {
  try {
    // Validate input
    const validatedData = GetPriceListMatrixSchema.parse(data);
    const { teamId, period } = validatedData;

    // Authorization check
    await checkTeamAccess(teamId);

    // Get team information
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        region: teams.region,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      throw new Error("Không tìm thấy thông tin đội/bếp");
    }

    if (!team.region) {
      throw new Error("Đội/bếp chưa được thiết lập khu vực");
    }

    // STEP 1: Find all suppliers that can service this team
    const validSuppliers = await db
      .select({
        supplierId: supplierServiceScopes.supplierId,
      })
      .from(supplierServiceScopes)
      .where(
        and(
          eq(supplierServiceScopes.teamId, teamId),
          eq(supplierServiceScopes.isActive, true)
        )
      );

    const validSupplierIds = validSuppliers.map(s => s.supplierId);

    if (validSupplierIds.length === 0) {
      // Return empty matrix if no suppliers can service this team
      return {
        products: [],
        suppliers: [],
        teamId,
        teamName: team.name,
        teamRegion: team.region,
        period,
        lastUpdated: new Date(),
        summary: {
          totalProducts: 0,
          quotedProducts: 0,
          missingProducts: 0,
          totalSuppliers: 0,
          averageCoverage: 0,
        },
      };
    }

    // STEP 2: Find all approved quotations for the team's region and period from valid suppliers
    const approvedQuotationData = await db
      .select({
        quotationId: quotations.id,
        quotationPeriod: quotations.period,
        quotationRegion: quotations.region,
        quotationStatus: quotations.status,
        quotationUpdatedAt: quotations.updatedAt,
        supplierId: suppliers.id,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        supplierContactPerson: suppliers.contactPerson,
        supplierPhone: suppliers.phone,
        supplierEmail: suppliers.email,
        itemId: quoteItems.id,
        productId: quoteItems.productId,
        productCode: products.productCode,
        productName: products.name,
        productSpecification: products.specification,
        productUnit: products.unit,
        productCategory: products.category,
        approvedPrice: quoteItems.approvedPrice,
        vatPercentage: quoteItems.vatPercentage,
        approvedAt: quoteItems.approvedAt,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .innerJoin(quoteItems, eq(quotations.id, quoteItems.quotationId))
      .innerJoin(products, eq(quoteItems.productId, products.id))
      .where(
        and(
          eq(quotations.status, 'approved'),
          eq(quotations.period, period),
          eq(quotations.region, team.region),
          inArray(quotations.supplierId, validSupplierIds),
          sql`${quoteItems.approvedPrice} IS NOT NULL AND ${quoteItems.approvedPrice} > 0`
        )
      )
      .orderBy(products.productCode, suppliers.supplierCode);

    // STEP 3: Transform data into price list matrix structure
    const productMap = new Map<number, {
      productId: number;
      productCode: string;
      productName: string;
      specification?: string;
      unit: string;
      category: string;
      suppliers: Record<number, any>;
      bestSupplierId?: number;
      bestPrice?: number;
      availableSuppliers: number;
    }>();

    const supplierMap = new Map<number, {
      id: number;
      code: string;
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      quotedProducts: number;
      totalProducts: number;
      coveragePercentage: number;
    }>();

    // Process each approved quote item
    approvedQuotationData.forEach(row => {
      // Initialize product entry if not exists
      if (!productMap.has(row.productId)) {
        productMap.set(row.productId, {
          productId: row.productId,
          productCode: row.productCode,
          productName: row.productName,
          specification: row.productSpecification || undefined,
          unit: row.productUnit,
          category: row.productCategory,
          suppliers: {},
          availableSuppliers: 0,
        });
      }

      // Initialize supplier entry if not exists
      if (!supplierMap.has(row.supplierId)) {
        supplierMap.set(row.supplierId, {
          id: row.supplierId,
          code: row.supplierCode || '',
          name: row.supplierName,
          contactPerson: row.supplierContactPerson || undefined,
          phone: row.supplierPhone || undefined,
          email: row.supplierEmail || undefined,
          quotedProducts: 0,
          totalProducts: 0,
          coveragePercentage: 0,
        });
      }

      const product = productMap.get(row.productId)!;
      const supplier = supplierMap.get(row.supplierId)!;

      // Calculate price with VAT
      const approvedPrice = Number(row.approvedPrice);
      const vatRate = Number(row.vatPercentage);
      const totalPriceWithVAT = approvedPrice * (1 + vatRate / 100);

      // Add supplier price to product
      product.suppliers[row.supplierId] = {
        supplierId: row.supplierId,
        supplierCode: row.supplierCode || '',
        supplierName: row.supplierName,
        approvedPrice,
        vatRate,
        pricePerUnit: approvedPrice, // Use approvedPrice as pricePerUnit
        totalPriceWithVAT,
        hasBestPrice: false, // Will be calculated later
        quotationId: row.quotationId,
        approvedAt: row.approvedAt || undefined,
      };

      product.availableSuppliers = Object.keys(product.suppliers).length;
      supplier.quotedProducts++;
    });

    // STEP 4: Find best prices for each product
    for (const product of productMap.values()) {
      let bestSupplierId: number | undefined;
      let bestPrice: number | undefined;

      for (const [supplierIdStr, supplierData] of Object.entries(product.suppliers)) {
        const supplierId = parseInt(supplierIdStr);
        const price = supplierData.totalPriceWithVAT;

        if (bestPrice === undefined || price < bestPrice) {
          bestPrice = price;
          bestSupplierId = supplierId;
        }
      }

      // Mark best price supplier
      if (bestSupplierId !== undefined) {
        product.suppliers[bestSupplierId].hasBestPrice = true;
        product.bestSupplierId = bestSupplierId;
        product.bestPrice = bestPrice;
      }
    }

    // STEP 5: Calculate supplier statistics
    const totalProducts = productMap.size;
    for (const supplier of supplierMap.values()) {
      supplier.totalProducts = totalProducts;
      supplier.coveragePercentage = totalProducts > 0
        ? Math.round((supplier.quotedProducts / totalProducts) * 100 * 100) / 100
        : 0;
    }

    // STEP 6: Calculate summary statistics
    const totalSuppliers = supplierMap.size;
    const quotedProducts = productMap.size;
    const missingProducts = 0; // In this context, we only show products with approved prices
    const averageCoverage = totalSuppliers > 0
      ? Array.from(supplierMap.values()).reduce((sum, s) => sum + s.coveragePercentage, 0) / totalSuppliers
      : 0;

    return {
      products: Array.from(productMap.values()).sort((a, b) => a.productCode.localeCompare(b.productCode)),
      suppliers: Array.from(supplierMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
      teamId,
      teamName: team.name,
      teamRegion: team.region,
      period,
      lastUpdated: new Date(),
      summary: {
        totalProducts: quotedProducts, // Only products with approved prices
        quotedProducts,
        missingProducts,
        totalSuppliers,
        averageCoverage: Math.round(averageCoverage * 100) / 100,
      },
    };

  } catch (error) {
    console.error("Error in getPriceListMatrix:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải bảng giá"
    );
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get team information for price list header
 */
export async function getTeamInfo(teamId: number): Promise<{
  id: number;
  name: string;
  region: string;
  teamCode?: string;
  manager?: { name: string; email: string };
}> {
  try {
    await checkTeamAccess(teamId);

    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        region: teams.region,
        teamCode: teams.teamCode,
        managerId: teams.managerId,
        managerName: sql<string>`CASE WHEN ${teams.managerId} IS NOT NULL THEN (SELECT name FROM users WHERE id = ${teams.managerId}) ELSE NULL END`,
        managerEmail: sql<string>`CASE WHEN ${teams.managerId} IS NOT NULL THEN (SELECT email FROM users WHERE id = ${teams.managerId}) ELSE NULL END`,
      })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      throw new Error("Không tìm thấy thông tin đội/bếp");
    }

    return {
      id: team.id,
      name: team.name,
      region: team.region || '',
      teamCode: team.teamCode || undefined,
      manager: team.managerName && team.managerEmail
        ? { name: team.managerName, email: team.managerEmail }
        : undefined,
    };

  } catch (error) {
    console.error("Error in getTeamInfo:", error);
    throw new Error("Lỗi khi tải thông tin đội/bếp");
  }
}

/**
 * Get supplier service scopes for a team (for management purposes)
 */
export async function getTeamSupplierScopes(teamId: number): Promise<Array<{
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>> {
  try {
    await checkTeamAccess(teamId);

    const scopes = await db
      .select({
        supplierId: supplierServiceScopes.supplierId,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        isActive: supplierServiceScopes.isActive,
        createdAt: supplierServiceScopes.createdAt,
        updatedAt: supplierServiceScopes.updatedAt,
      })
      .from(supplierServiceScopes)
      .innerJoin(suppliers, eq(supplierServiceScopes.supplierId, suppliers.id))
      .where(eq(supplierServiceScopes.teamId, teamId))
      .orderBy(suppliers.supplierCode);

    return scopes.map(scope => ({
      ...scope,
      supplierCode: scope.supplierCode || '',
    }));

  } catch (error) {
    console.error("Error in getTeamSupplierScopes:", error);
    throw new Error("Lỗi khi tải danh sách nhà cung cấp phục vụ");
  }
}

/**
 * Get price comparison for a specific product across suppliers
 */
export async function getProductPriceComparison(
  teamId: number,
  productId: number,
  period: string
): Promise<{
  product: {
    id: number;
    code: string;
    name: string;
    specification?: string;
    unit: string;
    category: string;
  };
  suppliers: Array<{
    supplierId: number;
    supplierCode: string;
    supplierName: string;
    approvedPrice: number;
    vatRate: number;
    totalPriceWithVAT: number;
    hasBestPrice: boolean;
    approvedAt?: Date;
  }>;
  bestPrice: number;
  priceRange: {
    min: number;
    max: number;
    difference: number;
    percentageDifference: number;
  };
}> {
  try {
    await checkTeamAccess(teamId);

    // Get product information
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Get team region
    const [team] = await db
      .select({ region: teams.region })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team?.region) {
      throw new Error("Không tìm thấy thông tin khu vực của đội/bếp");
    }

    // Get valid suppliers for this team
    const validSupplierIds = await db
      .select({ supplierId: supplierServiceScopes.supplierId })
      .from(supplierServiceScopes)
      .where(
        and(
          eq(supplierServiceScopes.teamId, teamId),
          eq(supplierServiceScopes.isActive, true)
        )
      );

    const supplierIds = validSupplierIds.map(s => s.supplierId);

    if (supplierIds.length === 0) {
      throw new Error("Không có nhà cung cấp nào phục vụ đội/bếp này");
    }

    // Get approved prices for this product
    const priceData = await db
      .select({
        supplierId: suppliers.id,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        approvedPrice: quoteItems.approvedPrice,
        vatPercentage: quoteItems.vatPercentage,
        approvedAt: quoteItems.approvedAt,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .innerJoin(quoteItems, eq(quotations.id, quoteItems.quotationId))
      .where(
        and(
          eq(quotations.status, 'approved'),
          eq(quotations.period, period),
          eq(quotations.region, team.region),
          eq(quoteItems.productId, productId),
          inArray(quotations.supplierId, supplierIds),
          sql`${quoteItems.approvedPrice} IS NOT NULL AND ${quoteItems.approvedPrice} > 0`
        )
      )
      .orderBy(suppliers.supplierCode);

    if (priceData.length === 0) {
      throw new Error("Không tìm thấy giá đã phê duyệt cho sản phẩm này");
    }

    // Calculate prices with VAT and find best price
    const supplierPrices = priceData.map(data => {
      const approvedPrice = Number(data.approvedPrice);
      const vatRate = Number(data.vatPercentage);
      const totalPriceWithVAT = approvedPrice * (1 + vatRate / 100);

      return {
        supplierId: data.supplierId,
        supplierCode: data.supplierCode || '',
        supplierName: data.supplierName,
        approvedPrice,
        vatRate,
        totalPriceWithVAT,
        hasBestPrice: false,
        approvedAt: data.approvedAt || undefined,
      };
    });

    // Find best price and mark it
    const prices = supplierPrices.map(s => s.totalPriceWithVAT);
    const bestPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    supplierPrices.forEach(supplier => {
      if (supplier.totalPriceWithVAT === bestPrice) {
        supplier.hasBestPrice = true;
      }
    });

    return {
      product: {
        id: product.id,
        code: product.productCode,
        name: product.name,
        specification: product.specification || undefined,
        unit: product.unit,
        category: product.category,
      },
      suppliers: supplierPrices,
      bestPrice,
      priceRange: {
        min: bestPrice,
        max: maxPrice,
        difference: maxPrice - bestPrice,
        percentageDifference: bestPrice > 0 ? ((maxPrice - bestPrice) / bestPrice) * 100 : 0,
      },
    };

  } catch (error) {
    console.error("Error in getProductPriceComparison:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi so sánh giá sản phẩm"
    );
  }
}

/**
 * Export price list matrix to Excel with complex multi-sheet structure
 * - Sheet 1: Supplier information
 * - Subsequent sheets: One per category with complex headers
 */
export async function exportPriceList(
  priceListData: PriceListMatrixData
): Promise<Blob> {
  try {
    console.log("[exportPriceList] Starting export with data:", {
      productsCount: priceListData.products.length,
      suppliersCount: priceListData.suppliers.length,
      teamName: priceListData.teamName,
      period: priceListData.period,
    });

    // Authorization check
    await checkTeamAccess(priceListData.teamId);

    if (!priceListData.products || priceListData.products.length === 0) {
      throw new Error("Không có dữ liệu sản phẩm để xuất file");
    }

    if (!priceListData.suppliers || priceListData.suppliers.length === 0) {
      throw new Error("Không có dữ liệu nhà cung cấp để xuất file");
    }

    // Create new workbook
    const workbook = new ExcelJS.Workbook();

    // ==================== SHEET 1: SUPPLIER INFORMATION ====================
    const supplierSheet = workbook.addWorksheet("Thông tin NCC");

    // Set up supplier sheet headers
    const supplierHeaders = [
      "Mã NCC",
      "Tên NCC",
      "Người liên hệ",
      "Số điện thoại",
      "Email",
      "Số sản phẩm báo giá",
      "Tổng số sản phẩm",
      "Tỷ lệ phủ (%)",
    ];

    const supplierHeaderRow = supplierSheet.addRow(supplierHeaders);
    supplierHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add supplier data rows
    priceListData.suppliers.forEach((supplier) => {
      const row = supplierSheet.addRow([
        supplier.code,
        supplier.name,
        supplier.contactPerson || "",
        supplier.phone || "",
        supplier.email || "",
        supplier.quotedProducts,
        supplier.totalProducts,
        supplier.coveragePercentage,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Auto-fit columns for supplier sheet
    supplierSheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    console.log(
      `[exportPriceList] Created supplier sheet with ${priceListData.suppliers.length} suppliers`
    );

    // ==================== CATEGORY SHEETS ====================
    // Group products by category
    const productsByCategory = new Map<string, typeof priceListData.products>();
    priceListData.products.forEach((product) => {
      if (!productsByCategory.has(product.category)) {
        productsByCategory.set(product.category, []);
      }
      productsByCategory.get(product.category)!.push(product);
    });

    console.log(
      `[exportPriceList] Processing ${productsByCategory.size} categories`
    );

    // Create a sheet for each category
    for (const [category, categoryProducts] of productsByCategory.entries()) {
      console.log(
        `[exportPriceList] Creating sheet for category: ${category} with ${categoryProducts.length} products`
      );

      const categorySheet = workbook.addWorksheet(category);

      // ==================== COMPLEX HEADER CONSTRUCTION ====================
      // Header structure:
      // Row 1: Product info headers + merged cells for each supplier name
      // Row 2: Empty for product info columns + "Đơn giá", "VAT %", "Giá có VAT" for each supplier

      const suppliers = priceListData.suppliers;
      const productInfoColCount = 4; // Mã SP, Tên SP, Quy cách, Đơn vị

      // ROW 1: Main header row
      const headerRow1 = categorySheet.getRow(1);
      headerRow1.height = 25;

      // Product info headers (row 1)
      headerRow1.getCell(1).value = "Mã sản phẩm";
      headerRow1.getCell(2).value = "Tên sản phẩm";
      headerRow1.getCell(3).value = "Quy cách";
      headerRow1.getCell(4).value = "Đơn vị";

      // Style product info headers
      for (let i = 1; i <= productInfoColCount; i++) {
        const cell = headerRow1.getCell(i);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF70AD47" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }

      // Merge cells for product info headers (spanning 2 rows)
      categorySheet.mergeCells(1, 1, 2, 1); // Mã sản phẩm
      categorySheet.mergeCells(1, 2, 2, 2); // Tên sản phẩm
      categorySheet.mergeCells(1, 3, 2, 3); // Quy cách
      categorySheet.mergeCells(1, 4, 2, 4); // Đơn vị

      // ROW 2: Sub-header row
      const headerRow2 = categorySheet.getRow(2);
      headerRow2.height = 20;

      // Supplier headers (spanning 3 columns each)
      let currentCol = productInfoColCount + 1;
      suppliers.forEach((supplier) => {
        // Merge cells for supplier name (row 1, spanning 3 columns)
        const startCol = currentCol;
        const endCol = currentCol + 2;

        categorySheet.mergeCells(1, startCol, 1, endCol);
        const supplierNameCell = headerRow1.getCell(startCol);
        supplierNameCell.value = supplier.name;
        supplierNameCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        supplierNameCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        supplierNameCell.alignment = { vertical: "middle", horizontal: "center" };
        supplierNameCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Sub-headers for this supplier (row 2)
        const priceCell = headerRow2.getCell(startCol);
        priceCell.value = "Đơn giá";
        priceCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        priceCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF5B9BD5" },
        };
        priceCell.alignment = { vertical: "middle", horizontal: "center" };
        priceCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        const vatCell = headerRow2.getCell(startCol + 1);
        vatCell.value = "VAT %";
        vatCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        vatCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF5B9BD5" },
        };
        vatCell.alignment = { vertical: "middle", horizontal: "center" };
        vatCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        const totalCell = headerRow2.getCell(startCol + 2);
        totalCell.value = "Giá có VAT";
        totalCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        totalCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF5B9BD5" },
        };
        totalCell.alignment = { vertical: "middle", horizontal: "center" };
        totalCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        currentCol += 3;
      });

      // ==================== DATA ROWS ====================
      categoryProducts.forEach((product) => {
        const dataRow = categorySheet.addRow([
          product.productCode,
          product.productName,
          product.specification || "",
          product.unit,
        ]);

        // Add supplier price data
        suppliers.forEach((supplier) => {
          const supplierData = product.suppliers[supplier.id];

          if (supplierData) {
            // Has price data
            dataRow.getCell(dataRow.cellCount + 1).value = supplierData.approvedPrice;
            dataRow.getCell(dataRow.cellCount + 1).value = supplierData.vatRate;
            dataRow.getCell(dataRow.cellCount + 1).value = supplierData.totalPriceWithVAT;

            // Highlight best price
            if (supplierData.hasBestPrice) {
              const priceCell = dataRow.getCell(dataRow.cellCount - 2);
              const vatCell = dataRow.getCell(dataRow.cellCount - 1);
              const totalCell = dataRow.getCell(dataRow.cellCount);

              priceCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFF00" }, // Yellow highlight
              };
              vatCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFF00" },
              };
              totalCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFFF00" },
              };
            }
          } else {
            // No price data - empty cells
            dataRow.getCell(dataRow.cellCount + 1).value = "";
            dataRow.getCell(dataRow.cellCount + 1).value = "";
            dataRow.getCell(dataRow.cellCount + 1).value = "";
          }
        });

        // Apply borders to all cells
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // Format number columns
        for (let i = productInfoColCount + 1; i <= dataRow.cellCount; i++) {
          const cell = dataRow.getCell(i);
          if (typeof cell.value === "number") {
            cell.numFmt = "#,##0.00";
          }
        }
      });

      // Auto-fit columns for category sheet
      categorySheet.columns.forEach((column, idx) => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: false }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
      });

      console.log(
        `[exportPriceList] Completed sheet for category: ${category}`
      );
    }

    // ==================== GENERATE FILE ====================
    const buffer = await workbook.xlsx.writeBuffer();

    console.log(
      `[exportPriceList] Generated Excel file with ${
        productsByCategory.size + 1
      } sheets`
    );

    // Return as Blob for download
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (error) {
    console.error("Error in exportPriceList:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi xuất file bảng giá"
    );
  }
}