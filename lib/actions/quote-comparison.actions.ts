"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/drizzle";
import {
  quotations,
  quoteItems,
  suppliers,
  products,
  kitchenPeriodDemands,
  priceHistory,
  type Quotation,
  type QuoteItem,
  type Supplier,
  type Product
} from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import {
  calculateComparisonMatrix,
  type PriceItem,
  type ComparisonMatrix
} from "@/lib/utils/price-calculation";
import {
  ComparisonMatrixSchema,
  BatchNegotiationSchema,
  NegotiateQuotationSchema,
  ApproveQuotationSchema,
  type ComparisonMatrixData,
  type NegotiationResult,
  type ApprovalResult,
} from "@/lib/types/quote-comparison.types";

// ==================== AUTHORIZATION HELPERS ====================

async function checkManagerRole() {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để thực hiện hành động này");
  }

  // TODO: Implement proper role checking for manager-level operations
  // This should check for ADMIN_SUPER_ADMIN or PROCUREMENT_MANAGER roles
  // For now, assume all authenticated users have access

  return user;
}

async function checkApprovalRole() {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để thực hiện hành động này");
  }

  // TODO: Implement proper role checking for approval operations
  // This should check for ADMIN_SUPER_ADMIN or PROCUREMENT_MANAGER roles
  // For now, assume all authenticated users have access

  return user;
}

// ==================== MAIN ACTIONS ====================

/**
 * Get comparison matrix for price analysis and negotiation
 */
export async function getComparisonMatrix(
  filters: z.infer<typeof ComparisonMatrixSchema>
): Promise<ComparisonMatrixData> {
  try {
    // Authorization check
    await checkManagerRole();

    // Validate input
    const validatedFilters = ComparisonMatrixSchema.parse(filters);
    const { period, region, category } = validatedFilters;

    // STEP 1: Fetch all active products in the given category
    const allProducts = await db
      .select({
        id: products.id,
        productCode: products.productCode,
        name: products.name,
        specification: products.specification,
        unit: products.unit,
        category: products.category,
        baseQuantity: products.baseQuantity,
      })
      .from(products)
      .where(
        and(
          eq(products.category, category),
          eq(products.status, 'active')
        )
      )
      .orderBy(products.productCode);

    if (allProducts.length === 0) {
      // Return empty matrix if no products in category
      return {
        products: [],
        suppliers: [],
        period,
        region,
        category,
        lastUpdated: new Date(),
        availableSuppliers: [],
      };
    }

    // STEP 2: Fetch all quotations and their quote_items that match the criteria
    const quotationData = await db
      .select({
        quotationId: quotations.id,
        quotationPeriod: quotations.period,
        quotationRegion: quotations.region,
        quotationStatus: quotations.status,
        quotationCreatedAt: quotations.createdAt,
        quotationUpdatedAt: quotations.updatedAt,
        supplierId: suppliers.id,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        supplierStatus: suppliers.status,
        itemId: quoteItems.id,
        productId: quoteItems.productId,
        productCode: products.productCode,
        productName: products.name,
        productUnit: products.unit,
        quantity: quoteItems.quantity,
        initialPrice: quoteItems.initialPrice,
        negotiatedPrice: quoteItems.negotiatedPrice,
        approvedPrice: quoteItems.approvedPrice,
        vatPercentage: quoteItems.vatPercentage,
        currency: quoteItems.currency,
        pricePerUnit: quoteItems.pricePerUnit,
        negotiationRounds: quoteItems.negotiationRounds,
        lastNegotiatedAt: quoteItems.lastNegotiatedAt,
        approvedAt: quoteItems.approvedAt,
        notes: quoteItems.notes,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .innerJoin(quoteItems, eq(quotations.id, quoteItems.quotationId))
      .innerJoin(products, eq(quoteItems.productId, products.id))
      .where(
        and(
          eq(quotations.period, period),
          eq(quotations.region, region),
          eq(products.category, category),
          eq(suppliers.status, 'active')
        )
      )
      .orderBy(products.productCode, suppliers.supplierCode);

    // STEP 3: Get kitchen demands for two-tier quantity logic
    const kitchenDemands = await db
      .select({
        productId: kitchenPeriodDemands.productId,
        quantity: kitchenPeriodDemands.quantity,
      })
      .from(kitchenPeriodDemands)
      .innerJoin(products, eq(kitchenPeriodDemands.productId, products.id))
      .where(
        and(
          eq(kitchenPeriodDemands.period, period),
          eq(products.category, category),
          eq(kitchenPeriodDemands.status, 'active')
        )
      );

    // STEP 4: Transform database results into PriceItem format
    // Defensive programming: Ensure quotationData is a valid array
    const priceItems: PriceItem[] = Array.isArray(quotationData) && quotationData.length > 0
      ? quotationData.map(row => {
          // Null-safety checks for each row
          if (!row || typeof row !== 'object') {
            console.warn('Invalid quotation row data:', row);
            return null;
          }

          return {
            id: row.itemId || 0,
            productId: row.productId || 0,
            productCode: row.productCode || '',
            productName: row.productName || '',
            supplierId: row.supplierId || 0,
            supplierCode: row.supplierCode || '',
            supplierName: row.supplierName || '',
            initialPrice: row.initialPrice ? Number(row.initialPrice) : undefined,
            negotiatedPrice: row.negotiatedPrice ? Number(row.negotiatedPrice) : undefined,
            approvedPrice: row.approvedPrice ? Number(row.approvedPrice) : undefined,
            vatRate: row.vatPercentage ? Number(row.vatPercentage) : 0,
            currency: row.currency || 'VND',
            quantity: row.quantity ? Number(row.quantity) : undefined,
            unit: row.productUnit || '',
          };
        }).filter(Boolean) as PriceItem[] // Remove any null entries
      : [];

    // STEP 5: Prepare base quantities from all products (fallback for two-tier logic)
    // Defensive programming: Ensure allProducts is a valid array
    const productBaseQuantities = Array.isArray(allProducts) && allProducts.length > 0
      ? allProducts.map(product => {
          if (!product || typeof product !== 'object') {
            console.warn('Invalid product data:', product);
            return { productId: 0, baseQuantity: 1 };
          }
          return {
            productId: product.id || 0,
            baseQuantity: Number(product.baseQuantity || 1),
          };
        })
      : [];

    // STEP 6: Calculate comparison matrix using utility function
    // Defensive programming: Ensure kitchenDemands is a valid array
    const kitchenDemandsProcessed = Array.isArray(kitchenDemands) && kitchenDemands.length > 0
      ? kitchenDemands.map(d => {
          if (!d || typeof d !== 'object') {
            console.warn('Invalid kitchen demand data:', d);
            return { productId: 0, quantity: 1 };
          }
          return {
            productId: d.productId || 0,
            quantity: Number(d.quantity || 1),
          };
        })
      : [];

    const matrix = calculateComparisonMatrix(
      priceItems,
      kitchenDemandsProcessed,
      productBaseQuantities,
      period,
      region,
      category
    );

    // STEP 7: Ensure ALL products from category are included (even without quotes)
    // Defensive programming: Ensure matrix and its products array exist
    if (!matrix || !matrix.products) {
      console.error('Matrix calculation failed, returning empty matrix');
      return {
        products: [],
        suppliers: [],
        period,
        region,
        category,
        lastUpdated: new Date(),
        availableSuppliers: [],
      };
    }

    // Defensive programming: Ensure priceItems array exists before mapping
    const quotedProductIds = Array.isArray(priceItems) && priceItems.length > 0
      ? new Set(priceItems.map(item => item?.productId).filter(id => id !== undefined))
      : new Set<number>();

    const missingProducts = Array.isArray(allProducts)
      ? allProducts.filter(product => product?.id && !quotedProductIds.has(product.id))
      : [];

    // Add missing products to the matrix
    missingProducts.forEach(product => {
      if (!product || !product.id) {
        console.warn('Invalid missing product data:', product);
        return;
      }

      const quantityInfo = Array.isArray(kitchenDemands)
        ? kitchenDemands.find(d => d?.productId === product.id)
        : null;

      const quantity = quantityInfo?.quantity
        ? Number(quantityInfo.quantity)
        : Number(product.baseQuantity || 1);

      matrix.products.push({
        productId: product.id,
        productCode: product.productCode || '',
        productName: product.name || '',
        unit: product.unit || '',
        quantity,
        quantitySource: quantityInfo ? 'kitchen_demand' : 'base_quantity',
        suppliers: {},
        bestSupplierId: undefined,
        bestPrice: undefined,
      });
    });

    // Sort products by product code - ensure matrix.products exists
    if (Array.isArray(matrix.products)) {
      matrix.products.sort((a, b) => {
        const codeA = a?.productCode || '';
        const codeB = b?.productCode || '';
        return codeA.localeCompare(codeB);
      });
    }

    // STEP 8: Calculate supplier statistics for the comparison matrix
    const supplierStats = new Map();

    // Get all unique suppliers from quotations in this period/region
    const allQuotationsInScope = await db
      .select({
        supplierId: quotations.supplierId,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        supplierStatus: suppliers.status,
        quotationStatus: quotations.status,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(
        and(
          eq(quotations.period, period),
          eq(quotations.region, region),
          eq(suppliers.status, 'active')
        )
      );

    // Calculate statistics for each supplier
    // Defensive programming: Ensure allQuotationsInScope is a valid array
    if (Array.isArray(allQuotationsInScope) && allQuotationsInScope.length > 0) {
      allQuotationsInScope.forEach(quote => {
        if (!quote || typeof quote !== 'object' || !quote.supplierId) {
          console.warn('Invalid quotation scope data:', quote);
          return;
        }

        if (!supplierStats.has(quote.supplierId)) {
          supplierStats.set(quote.supplierId, {
            id: quote.supplierId,
            code: quote.supplierCode || '',
            name: quote.supplierName || '',
            status: quote.supplierStatus || 'unknown',
            totalQuotations: 0,
            pendingQuotations: 0,
            negotiationQuotations: 0,
            approvedQuotations: 0,
          });
        }

        const stats = supplierStats.get(quote.supplierId);
        if (stats) {
          stats.totalQuotations++;

          switch (quote.quotationStatus) {
            case 'pending':
              stats.pendingQuotations++;
              break;
            case 'negotiation':
              stats.negotiationQuotations++;
              break;
            case 'approved':
              stats.approvedQuotations++;
              break;
          }
        }
      });
    }

    return {
      ...matrix,
      lastUpdated: new Date(),
      availableSuppliers: Array.from(supplierStats.values()),
    };

  } catch (error) {
    console.error("Error in getComparisonMatrix:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải ma trận so sánh báo giá"
    );
  }
}

/**
 * Batch negotiation - update multiple quotations to negotiation status
 */
export async function batchNegotiation(
  data: z.infer<typeof BatchNegotiationSchema>
): Promise<NegotiationResult> {
  try {
    // Authorization check
    await checkManagerRole();

    // Validate input
    const validatedData = BatchNegotiationSchema.parse(data);
    const { quotationIds } = validatedData;

    // Get quotations that can be moved to negotiation
    const quotationsToUpdate = await db
      .select({
        id: quotations.id,
        supplierId: quotations.supplierId,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        status: quotations.status,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(
        and(
          inArray(quotations.id, quotationIds),
          inArray(quotations.status, ['pending', 'negotiation'])
        )
      );

    if (quotationsToUpdate.length === 0) {
      throw new Error("Không tìm thấy báo giá hợp lệ để đàm phán");
    }

    // Update quotation statuses
    const validIds = quotationsToUpdate.map(q => q.id);
    const updateResult = await db
      .update(quotations)
      .set({
        status: 'negotiation',
        updateDate: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(quotations.id, validIds));

    // Get affected supplier names
    const affectedSuppliers = [...new Set(quotationsToUpdate.map(q => q.supplierName))];

    // Revalidate relevant pages
    revalidatePath('/so-sanh');
    revalidatePath('/bao-gia');

    return {
      success: `Đã chuyển ${quotationsToUpdate.length} báo giá sang trạng thái đàm phán`,
      updatedQuotations: quotationsToUpdate.length,
      affectedSuppliers,
    };

  } catch (error) {
    console.error("Error in batchNegotiation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi thực hiện đàm phán hàng loạt"
    );
  }
}

/**
 * Negotiate single quotation
 */
export async function negotiateQuotation(
  data: z.infer<typeof NegotiateQuotationSchema>
): Promise<{ success: string }> {
  try {
    // Authorization check
    await checkManagerRole();

    // Validate input
    const validatedData = NegotiateQuotationSchema.parse(data);
    const { id } = validatedData;

    // Check if quotation exists and can be negotiated
    const [quotation] = await db
      .select({
        id: quotations.id,
        status: quotations.status,
        supplierName: suppliers.name,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(eq(quotations.id, id))
      .limit(1);

    if (!quotation) {
      throw new Error("Không tìm thấy báo giá");
    }

    if (!['pending', 'negotiation'].includes(quotation.status)) {
      throw new Error("Không thể đàm phán báo giá với trạng thái hiện tại");
    }

    // Update quotation status
    await db
      .update(quotations)
      .set({
        status: 'negotiation',
        updateDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id));

    // Revalidate relevant pages
    revalidatePath('/so-sanh');
    revalidatePath('/bao-gia');

    return {
      success: `Đã chuyển báo giá của ${quotation.supplierName} sang trạng thái đàm phán`,
    };

  } catch (error) {
    console.error("Error in negotiateQuotation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi đàm phán báo giá"
    );
  }
}

/**
 * Approve quotation with final prices
 */
export async function approveQuotation(
  data: z.infer<typeof ApproveQuotationSchema>
): Promise<ApprovalResult> {
  try {
    // Authorization check
    const user = await checkApprovalRole();

    // Validate input
    const validatedData = ApproveQuotationSchema.parse(data);
    const { id, approvedPrices } = validatedData;

    // Get quotation details
    const [quotation] = await db
      .select({
        id: quotations.id,
        period: quotations.period,
        region: quotations.region,
        supplierId: quotations.supplierId,
        status: quotations.status,
        supplierName: suppliers.name,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(eq(quotations.id, id))
      .limit(1);

    if (!quotation) {
      throw new Error("Không tìm thấy báo giá");
    }

    if (quotation.status === 'approved') {
      throw new Error("Báo giá đã được phê duyệt trước đó");
    }

    if (quotation.status === 'cancelled') {
      throw new Error("Không thể phê duyệt báo giá đã bị hủy");
    }

    // Process approval in transaction
    const result = await db.transaction(async (tx) => {
      let approvedItems = 0;
      let totalApprovedValue = 0;
      let loggedPriceHistory = 0;

      // Get all quote items for this quotation
      const items = await tx
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quotationId, id));

      // Process approved prices and update quote items
      for (const item of items) {
        let finalApprovedPrice: number | null = null;

        // Determine approved price
        if (approvedPrices && approvedPrices[item.id.toString()]) {
          finalApprovedPrice = approvedPrices[item.id.toString()];
        } else if (item.negotiatedPrice) {
          finalApprovedPrice = Number(item.negotiatedPrice);
        } else if (item.initialPrice) {
          finalApprovedPrice = Number(item.initialPrice);
        }

        if (finalApprovedPrice !== null && finalApprovedPrice > 0) {
          // Update quote item with approved price
          await tx
            .update(quoteItems)
            .set({
              approvedPrice: finalApprovedPrice,
              approvedAt: new Date(),
              approvedBy: user.id,
              updatedAt: new Date(),
            })
            .where(eq(quoteItems.id, item.id));

          approvedItems++;
          totalApprovedValue += finalApprovedPrice * (Number(item.quantity) || 1);

          // Log to price history
          await tx.insert(priceHistory).values({
            productId: item.productId,
            supplierId: quotation.supplierId,
            period: quotation.period,
            price: finalApprovedPrice,
            priceType: 'approved',
            region: quotation.region,
          });

          loggedPriceHistory++;
        }
      }

      // Update quotation status
      await tx
        .update(quotations)
        .set({
          status: 'approved',
          updateDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotations.id, id));

      return {
        approvedItems,
        totalApprovedValue,
        loggedPriceHistory,
      };
    });

    // Revalidate relevant pages
    revalidatePath('/so-sanh');
    revalidatePath('/bao-gia');
    revalidatePath('/bang-gia');

    return {
      success: `Đã phê duyệt báo giá của ${quotation.supplierName} với ${result.approvedItems} sản phẩm`,
      approvedItems: result.approvedItems,
      totalApprovedValue: result.totalApprovedValue,
      loggedPriceHistory: result.loggedPriceHistory,
    };

  } catch (error) {
    console.error("Error in approveQuotation:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi phê duyệt báo giá"
    );
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get available product categories for comparison
 */
export async function getAvailableCategories(): Promise<string[]> {
  try {
    await checkManagerRole();

    const categories = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.status, 'active'))
      .orderBy(products.category);

    return categories.map(c => c.category);

  } catch (error) {
    console.error("Error in getAvailableCategories:", error);
    throw new Error("Lỗi khi tải danh sách nhóm hàng");
  }
}

/**
 * Get quotation summary for comparison page filters
 */
export async function getQuotationSummary(period: string, region: string): Promise<{
  totalQuotations: number;
  pendingQuotations: number;
  negotiationQuotations: number;
  approvedQuotations: number;
  cancelledQuotations: number;
  suppliers: number;
}> {
  try {
    await checkManagerRole();

    const [summary] = await db
      .select({
        totalQuotations: sql<number>`COUNT(*)`,
        pendingQuotations: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
        negotiationQuotations: sql<number>`COUNT(CASE WHEN status = 'negotiation' THEN 1 END)`,
        approvedQuotations: sql<number>`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
        cancelledQuotations: sql<number>`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)`,
        suppliers: sql<number>`COUNT(DISTINCT supplier_id)`,
      })
      .from(quotations)
      .where(
        and(
          eq(quotations.period, period),
          eq(quotations.region, region)
        )
      );

    return summary;

  } catch (error) {
    console.error("Error in getQuotationSummary:", error);
    throw new Error("Lỗi khi tải tổng quan báo giá");
  }
}

/**
 * Get regions that have quotations for a specific period (cascading filter)
 */
export async function getRegionsForPeriod(period: string): Promise<string[]> {
  try {
    await checkManagerRole();

    if (!period) {
      return [];
    }

    const regions = await db
      .selectDistinct({ region: quotations.region })
      .from(quotations)
      .where(eq(quotations.period, period))
      .orderBy(quotations.region);

    return regions
      .map(r => r.region)
      .filter((region): region is string => Boolean(region));

  } catch (error) {
    console.error("Error in getRegionsForPeriod:", error);
    throw new Error("Lỗi khi tải danh sách khu vực theo kỳ");
  }
}

/**
 * Get product categories that have quotations for a specific period and region (cascading filter)
 */
export async function getCategoriesForPeriodAndRegion(
  period: string,
  region: string
): Promise<string[]> {
  try {
    await checkManagerRole();

    if (!period || !region) {
      return [];
    }

    const categories = await db
      .selectDistinct({ category: products.category })
      .from(quotations)
      .innerJoin(quoteItems, eq(quotations.id, quoteItems.quotationId))
      .innerJoin(products, eq(quoteItems.productId, products.id))
      .where(
        and(
          eq(quotations.period, period),
          eq(quotations.region, region),
          eq(products.status, 'active')
        )
      )
      .orderBy(products.category);

    return categories
      .map(c => c.category)
      .filter((category): category is string => Boolean(category));

  } catch (error) {
    console.error("Error in getCategoriesForPeriodAndRegion:", error);
    throw new Error("Lỗi khi tải danh sách nhóm hàng theo kỳ và khu vực");
  }
}