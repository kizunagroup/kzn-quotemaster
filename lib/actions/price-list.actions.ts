"use server";

import { z } from "zod";
import { db } from "@/lib/db/drizzle";
import {
  quotations,
  quoteItems,
  suppliers,
  products,
  teams,
  supplierServiceScopes,
  type Quotation,
  type QuoteItem,
  type Supplier,
  type Product,
  type Team
} from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import {
  calculatePriceListMatrix,
  type PriceItem
} from "@/lib/utils/price-calculation";

// ==================== VALIDATION SCHEMAS ====================

// Price list request schemas
export const GetAvailablePeriodsSchema = z.object({
  teamId: z.number().positive("ID đội/bếp không hợp lệ"),
});

export const GetPriceListMatrixSchema = z.object({
  teamId: z.number().positive("ID đội/bếp không hợp lệ"),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kỳ báo giá phải có định dạng YYYY-MM-DD"),
});

// ==================== TYPES ====================

export interface PeriodInfo {
  period: string;
  approvedQuotations: number;
  availableSuppliers: number;
  totalProducts: number;
  lastUpdated: Date;
}

export interface PriceListMatrixData {
  products: Array<{
    productId: number;
    productCode: string;
    productName: string;
    specification?: string;
    unit: string;
    category: string;
    suppliers: Record<number, {
      supplierId: number;
      supplierCode: string;
      supplierName: string;
      approvedPrice: number;
      vatRate: number;
      pricePerUnit: number;
      totalPriceWithVAT: number;
      hasBestPrice: boolean;
      quotationId: number;
      approvedAt?: Date;
    }>;
    bestSupplierId?: number;
    bestPrice?: number;
    availableSuppliers: number;
  }>;
  suppliers: Array<{
    id: number;
    code: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    quotedProducts: number;
    totalProducts: number;
    coveragePercentage: number;
  }>;
  teamId: number;
  teamName: string;
  teamRegion: string;
  period: string;
  lastUpdated: Date;
  summary: {
    totalProducts: number;
    quotedProducts: number;
    missingProducts: number;
    totalSuppliers: number;
    averageCoverage: number;
  };
}

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
        pricePerUnit: quoteItems.pricePerUnit,
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
          code: row.supplierCode,
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
        supplierCode: row.supplierCode,
        supplierName: row.supplierName,
        approvedPrice,
        vatRate,
        pricePerUnit: Number(row.pricePerUnit || approvedPrice),
        totalPriceWithVAT,
        hasBestPrice: false, // Will be calculated later
        quotationId: row.quotationId,
        approvedAt: row.approvedAt,
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
      region: team.region,
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

    return scopes;

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
        supplierCode: data.supplierCode,
        supplierName: data.supplierName,
        approvedPrice,
        vatRate,
        totalPriceWithVAT,
        hasBestPrice: false,
        approvedAt: data.approvedAt,
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