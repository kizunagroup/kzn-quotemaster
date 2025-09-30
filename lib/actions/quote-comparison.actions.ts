"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
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
 * Implements "initialize then populate" pattern for absolute null-safety
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

    console.log(`[getComparisonMatrix] Starting comparison for period: ${period}, region: ${region}, category: ${category}`);

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

    console.log(`[getComparisonMatrix] Found ${allProducts?.length || 0} products in category ${category}`);

    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      console.log(`[getComparisonMatrix] No products found, returning empty matrix`);
      return {
        products: [],
        suppliers: [],
        period,
        region,
        category,
        lastUpdated: new Date(),
        overviewKPIs: {
          totalCurrentValue: 0,
          comparisonVsInitial: { difference: 0, percentage: 0 },
          comparisonVsPrevious: { difference: 0, percentage: 0, hasPreviousData: false },
          comparisonVsBase: { difference: 0, percentage: 0, hasBaseData: false },
          totalProducts: 0,
          totalSuppliers: 0,
          productsWithPrevious: 0
        },
        availableSuppliers: [],
      };
    }

    // STEP 2: Fetch all active suppliers with quotations in this period/region
    const allSuppliers = await db
      .selectDistinct({
        id: suppliers.id,
        supplierCode: suppliers.supplierCode,
        name: suppliers.name,
        status: suppliers.status,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(
        and(
          eq(quotations.period, period),
          eq(quotations.region, region),
          eq(suppliers.status, 'active')
        )
      )
      .orderBy(suppliers.supplierCode);

    console.log(`[getComparisonMatrix] Found ${allSuppliers?.length || 0} suppliers with quotations`);

    // STEP 3: Fetch kitchen demands for quantity calculations
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

    console.log(`[getComparisonMatrix] Found ${kitchenDemands?.length || 0} kitchen demands`);

    // STEP 4: Initialize the matrix structure (Initialize Phase)
    console.log(`[getComparisonMatrix] Initializing matrix structure...`);

    const matrixProducts = [];
    const matrixSuppliers = [];

    // Create kitchen demands lookup for efficient access
    const kitchenDemandsMap = new Map();
    if (Array.isArray(kitchenDemands)) {
      kitchenDemands.forEach(demand => {
        if (demand?.productId && demand?.quantity !== undefined) {
          kitchenDemandsMap.set(demand.productId, Number(demand.quantity) || 1);
        }
      });
    }

    // Initialize all products with default structure
    allProducts.forEach(product => {
      if (!product?.id) {
        console.warn(`[getComparisonMatrix] Invalid product data:`, product);
        return;
      }

      const quantity = kitchenDemandsMap.get(product.id) || Number(product.baseQuantity) || 1;
      const quantitySource = kitchenDemandsMap.has(product.id) ? 'kitchen_demand' : 'base_quantity';

      matrixProducts.push({
        productId: product.id,
        productCode: product.productCode || '',
        productName: product.name || '',
        unit: product.unit || '',
        quantity,
        quantitySource,
        baseQuantity: Number(product.baseQuantity) || 1,
        suppliers: {}, // Will be populated with supplier data
        bestSupplierId: undefined,
        bestPrice: undefined,
        previousApprovedPrice: undefined, // Will be populated later
      });
    });

    // Initialize supplier statistics
    if (Array.isArray(allSuppliers)) {
      allSuppliers.forEach(supplier => {
        if (!supplier?.id) {
          console.warn(`[getComparisonMatrix] Invalid supplier data:`, supplier);
          return;
        }

        matrixSuppliers.push({
          id: supplier.id,
          code: supplier.supplierCode || '',
          name: supplier.name || '',
          totalProducts: 0,
          quotedProducts: 0,
          coveragePercentage: 0,
        });
      });
    }

    console.log(`[getComparisonMatrix] Initialized matrix with ${matrixProducts.length} products and ${matrixSuppliers.length} suppliers`);

    // STEP 5: Fetch and populate quotation data (Populate Phase)
    const quotationData = await db
      .select({
        quotationId: quotations.id,
        quotationStatus: quotations.status,
        supplierId: suppliers.id,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        itemId: quoteItems.id,
        productId: quoteItems.productId,
        quantity: quoteItems.quantity,
        initialPrice: quoteItems.initialPrice,
        negotiatedPrice: quoteItems.negotiatedPrice,
        approvedPrice: quoteItems.approvedPrice,
        vatPercentage: quoteItems.vatPercentage,
        currency: quoteItems.currency,
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
      );

    console.log(`[getComparisonMatrix] Found ${quotationData?.length || 0} quotation items to populate`);

    // Create lookup maps for efficient population
    const productMap = new Map();
    matrixProducts.forEach((product, index) => {
      productMap.set(product.productId, index);
    });

    const supplierMap = new Map();
    matrixSuppliers.forEach(supplier => {
      supplierMap.set(supplier.id, supplier);
    });

    // Populate the matrix with quotation data
    if (Array.isArray(quotationData)) {
      quotationData.forEach(row => {
        if (!row?.productId || !row?.supplierId) {
          console.warn(`[getComparisonMatrix] Invalid quotation row:`, row);
          return;
        }

        const productIndex = productMap.get(row.productId);
        if (productIndex === undefined) {
          console.warn(`[getComparisonMatrix] Product not found in matrix:`, row.productId);
          return;
        }

        const product = matrixProducts[productIndex];
        if (!product) {
          console.warn(`[getComparisonMatrix] Product at index ${productIndex} is undefined`);
          return;
        }

        // Determine the effective price (priority: approved > negotiated > initial)
        const initialPrice = row.initialPrice ? Number(row.initialPrice) : undefined;
        const negotiatedPrice = row.negotiatedPrice ? Number(row.negotiatedPrice) : undefined;
        const approvedPrice = row.approvedPrice ? Number(row.approvedPrice) : undefined;

        const effectivePrice = approvedPrice ?? negotiatedPrice ?? initialPrice;
        const vatRate = row.vatPercentage ? Number(row.vatPercentage) : 0;

        let pricePerUnit = 0;
        let totalPrice = 0;
        let vatAmount = 0;
        let totalPriceWithVAT = 0;
        let hasPrice = false;

        if (effectivePrice !== undefined && effectivePrice > 0) {
          pricePerUnit = effectivePrice;
          totalPrice = pricePerUnit * product.quantity;
          vatAmount = totalPrice * (vatRate / 100);
          totalPriceWithVAT = totalPrice + vatAmount;
          hasPrice = true;
        }

        // Add supplier data to product
        product.suppliers[row.supplierId] = {
          id: row.itemId || 0,
          productId: row.productId,
          productCode: product.productCode,
          productName: product.productName,
          supplierId: row.supplierId,
          supplierCode: row.supplierCode || '',
          supplierName: row.supplierName || '',
          initialPrice,
          negotiatedPrice,
          approvedPrice,
          vatRate,
          currency: row.currency || 'VND',
          quantity: product.quantity,
          unit: product.unit,
          // Calculated metrics
          pricePerUnit,
          totalPrice,
          vatAmount,
          totalPriceWithVAT,
          hasBestPrice: false, // Will be calculated in next step
          hasPrice,
        };

        // Update supplier statistics
        const supplier = supplierMap.get(row.supplierId);
        if (supplier) {
          supplier.quotedProducts++;
        }
      });
    }

    // STEP 6: Calculate best prices and update supplier statistics
    console.log(`[getComparisonMatrix] Calculating best prices and supplier coverage...`);

    matrixProducts.forEach(product => {
      const supplierIds = Object.keys(product.suppliers).map(Number);
      let bestPrice = Infinity;
      let bestSupplierId = undefined;

      // Find best price among suppliers with valid prices
      supplierIds.forEach(supplierId => {
        const supplierData = product.suppliers[supplierId];
        if (supplierData?.hasPrice && supplierData.pricePerUnit > 0) {
          if (supplierData.pricePerUnit < bestPrice) {
            bestPrice = supplierData.pricePerUnit;
            bestSupplierId = supplierId;
          }
        }
      });

      // Update best price indicators
      if (bestSupplierId !== undefined && bestPrice !== Infinity) {
        product.bestSupplierId = bestSupplierId;
        product.bestPrice = bestPrice;

        // Mark the best price supplier
        if (product.suppliers[bestSupplierId]) {
          product.suppliers[bestSupplierId].hasBestPrice = true;
        }
      }
    });

    // Calculate supplier coverage percentages
    matrixSuppliers.forEach(supplier => {
      supplier.totalProducts = matrixProducts.length;
      supplier.coveragePercentage = matrixProducts.length > 0
        ? Math.round((supplier.quotedProducts / matrixProducts.length) * 100)
        : 0;
    });

    // STEP 7: Fetch supplier statistics for available suppliers list
    const supplierStatsQuery = await db
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

    // STEP 7b: Get regional quotation data for each supplier
    console.log(`[getComparisonMatrix] Fetching regional quotation data...`);
    const regionalQuotationsQuery = await db
      .select({
        supplierId: suppliers.id,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        supplierStatus: suppliers.status,
        quotationId: quotations.id,
        quotationStatus: quotations.status,
        quotationSubmittedAt: quotations.submittedAt,
        quotationLastUpdated: quotations.updatedAt,
      })
      .from(suppliers)
      .leftJoin(quotations, and(
        eq(quotations.supplierId, suppliers.id),
        eq(quotations.period, period),
        eq(quotations.region, region),
        category ? eq(quotations.category, category) : undefined
      ))
      .where(eq(suppliers.status, 'active'));

    const supplierStatsMap = new Map();

    // Initialize suppliers with regional quotation data
    if (Array.isArray(regionalQuotationsQuery) && regionalQuotationsQuery.length > 0) {
      regionalQuotationsQuery.forEach(item => {
        // Robust null-safety checks for LEFT JOIN results
        if (!item || typeof item !== 'object' || !item.supplierId) {
          console.warn(`[getComparisonMatrix] Skipping invalid supplier data:`, item);
          return;
        }

        if (!supplierStatsMap.has(item.supplierId)) {
          supplierStatsMap.set(item.supplierId, {
            id: item.supplierId,
            code: item.supplierCode || '',
            name: item.supplierName || '',
            status: item.supplierStatus || 'unknown',
            // NEW: Add quotation-level data with null-safety checks
            quotationId: item.quotationId ?? null,
            quotationStatus: (item.quotationStatus as 'draft' | 'submitted' | 'negotiation' | 'approved' | 'rejected') ?? null,
            quotationSubmittedAt: item.quotationSubmittedAt ?? null,
            quotationLastUpdated: item.quotationLastUpdated ?? null,
            // Statistics (will be populated below)
            totalQuotations: 0,
            pendingQuotations: 0,
            negotiationQuotations: 0,
            approvedQuotations: 0,
          });
        }
      });
    } else {
      console.warn(`[getComparisonMatrix] No regional quotation data found for period=${period}, region=${region}, category=${category}`);
    }

    // Ensure we have at least basic supplier data even if no regional quotations exist
    if (supplierStatsMap.size === 0) {
      console.log(`[getComparisonMatrix] No suppliers with regional quotations found, falling back to active suppliers query...`);

      // Fallback: Get all active suppliers without quotation data
      const activeSuppliers = await db
        .select({
          id: suppliers.id,
          supplierCode: suppliers.supplierCode,
          name: suppliers.name,
          status: suppliers.status,
        })
        .from(suppliers)
        .where(eq(suppliers.status, 'active'));

      activeSuppliers.forEach(supplier => {
        if (supplier.id) {
          supplierStatsMap.set(supplier.id, {
            id: supplier.id,
            code: supplier.supplierCode || '',
            name: supplier.name || '',
            status: supplier.status || 'unknown',
            // No quotation data available
            quotationId: null,
            quotationStatus: null,
            quotationSubmittedAt: null,
            quotationLastUpdated: null,
            // Statistics
            totalQuotations: 0,
            pendingQuotations: 0,
            negotiationQuotations: 0,
            approvedQuotations: 0,
          });
        }
      });
    }

    // Populate statistics from all quotations
    if (Array.isArray(supplierStatsQuery) && supplierStatsQuery.length > 0) {
      supplierStatsQuery.forEach(quote => {
        if (!quote || typeof quote !== 'object' || !quote.supplierId) {
          console.warn(`[getComparisonMatrix] Skipping invalid quotation data:`, quote);
          return;
        }

        const stats = supplierStatsMap.get(quote.supplierId);
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
            default:
              // Handle unknown statuses gracefully
              console.debug(`[getComparisonMatrix] Unknown quotation status: ${quote.quotationStatus}`);
              break;
          }
        } else {
          console.warn(`[getComparisonMatrix] No supplier stats found for supplier ID: ${quote.supplierId}`);
        }
      });
    } else {
      console.log(`[getComparisonMatrix] No quotation statistics data available`);
    }

    // STEP 8: Calculate Overview KPIs
    console.log(`[getComparisonMatrix] Calculating overview KPIs...`);

    // Get previous approved prices for comparison
    const previousApprovedPrices = await getPreviousApprovedPrices(period, region, category);

    // Calculate KPIs
    let totalCurrentValue = 0;
    let totalInitialValue = 0;
    let totalPreviousValue = 0;
    let totalBaseValue = 0;

    let productsWithPrevious = 0;
    let productsWithBase = 0;

    matrixProducts.forEach(product => {
      // Add previous approved price to product data
      const previousPrice = previousApprovedPrices.get(product.productId);
      if (previousPrice) {
        product.previousApprovedPrice = previousPrice.price;
      }

      // Find the best current price (effective price from any supplier)
      let bestCurrentPrice = 0;
      let bestInitialPrice = 0;

      Object.values(product.suppliers).forEach(supplierData => {
        if (supplierData.hasPrice) {
          const currentPrice = supplierData.pricePerUnit;
          const initialPrice = supplierData.initialPrice || 0;

          if (bestCurrentPrice === 0 || (currentPrice > 0 && currentPrice < bestCurrentPrice)) {
            bestCurrentPrice = currentPrice;
          }

          if (bestInitialPrice === 0 || (initialPrice > 0 && initialPrice < bestInitialPrice)) {
            bestInitialPrice = initialPrice;
          }
        }
      });

      // Calculate values for this product
      const productTotalCurrent = bestCurrentPrice * product.quantity;
      const productTotalInitial = bestInitialPrice * product.quantity;

      totalCurrentValue += productTotalCurrent;
      totalInitialValue += productTotalInitial;

      // Previous period comparison
      if (previousPrice) {
        totalPreviousValue += previousPrice.price * product.quantity;
        productsWithPrevious++;
      }

      // Base quantity comparison (always include for comparison with base quantities)
      if (bestCurrentPrice > 0) {
        const baseTotal = bestCurrentPrice * product.baseQuantity;
        totalBaseValue += baseTotal;
        // Only count as having "base data" if base quantity differs from current
        if (product.baseQuantity !== product.quantity) {
          productsWithBase++;
        }
      }
    });

    // Calculate comparison metrics
    const comparisonVsInitial = {
      difference: totalCurrentValue - totalInitialValue,
      percentage: totalInitialValue > 0 ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100 : 0
    };

    const comparisonVsPrevious = {
      difference: productsWithPrevious > 0 ? totalCurrentValue - totalPreviousValue : 0,
      percentage: productsWithPrevious > 0 && totalPreviousValue > 0
        ? ((totalCurrentValue - totalPreviousValue) / totalPreviousValue) * 100
        : 0,
      hasPreviousData: productsWithPrevious > 0
    };

    const comparisonVsBase = {
      difference: productsWithBase > 0 ? totalCurrentValue - totalBaseValue : 0,
      percentage: productsWithBase > 0 && totalBaseValue > 0
        ? ((totalCurrentValue - totalBaseValue) / totalBaseValue) * 100
        : 0,
      hasBaseData: productsWithBase > 0
    };

    const overviewKPIs = {
      totalCurrentValue,
      comparisonVsInitial,
      comparisonVsPrevious,
      comparisonVsBase,
      totalProducts: matrixProducts.length,
      totalSuppliers: matrixSuppliers.length,
      productsWithPrevious
    };

    console.log(`[getComparisonMatrix] KPIs calculated:`, {
      totalCurrentValue: totalCurrentValue.toFixed(0),
      vsInitial: `${comparisonVsInitial.percentage.toFixed(1)}%`,
      vsPrevious: comparisonVsPrevious.hasPreviousData ? `${comparisonVsPrevious.percentage.toFixed(1)}%` : 'No data',
      vsBase: comparisonVsBase.hasBaseData ? `${comparisonVsBase.percentage.toFixed(1)}%` : 'No data',
      productsWithPrevious,
      productsWithBase
    });

    const finalMatrix = {
      products: matrixProducts,
      suppliers: matrixSuppliers,
      period,
      region,
      category,
      lastUpdated: new Date(),
      overviewKPIs,
      availableSuppliers: Array.from(supplierStatsMap.values()),
    };

    console.log(`[getComparisonMatrix] Final matrix structure:`, {
      productsCount: finalMatrix.products.length,
      suppliersCount: finalMatrix.suppliers.length,
      availableSuppliersCount: finalMatrix.availableSuppliers.length,
      sampleProduct: finalMatrix.products[0] ? {
        productId: finalMatrix.products[0].productId,
        productCode: finalMatrix.products[0].productCode,
        suppliersWithQuotes: Object.keys(finalMatrix.products[0].suppliers).length,
      } : 'No products',
    });

    return finalMatrix;

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

// ==================== HELPER FUNCTIONS ====================

/**
 * Get previous approved prices for a given region and current period
 * This function finds the most recent period before the current one that has approved prices
 */
async function getPreviousApprovedPrices(
  currentPeriod: string,
  region: string,
  category: string
): Promise<Map<number, { price: number; period: string }>> {
  try {
    // Parse current period to find previous periods
    const [year, month] = currentPeriod.split('-').map(Number);

    // Generate a list of previous periods to check (up to 12 months back)
    const previousPeriods: string[] = [];
    for (let i = 1; i <= 12; i++) {
      let prevYear = year;
      let prevMonth = month - i;

      while (prevMonth <= 0) {
        prevMonth += 12;
        prevYear -= 1;
      }

      // Generate all possible period formats for this month (XX can be any number)
      for (let seq = 1; seq <= 31; seq++) {
        const seqStr = seq.toString().padStart(2, '0');
        previousPeriods.push(`${prevYear}-${prevMonth.toString().padStart(2, '0')}-${seqStr}`);
      }
    }

    console.log(`[getPreviousApprovedPrices] Checking ${previousPeriods.length} previous periods for ${currentPeriod}`);

    // Find approved prices from the most recent previous period
    const previousApprovedPrices = await db
      .select({
        productId: quoteItems.productId,
        approvedPrice: quoteItems.approvedPrice,
        period: quotations.period,
        updatedAt: quoteItems.updatedAt,
      })
      .from(quoteItems)
      .innerJoin(quotations, eq(quoteItems.quotationId, quotations.id))
      .innerJoin(products, eq(quoteItems.productId, products.id))
      .where(
        and(
          inArray(quotations.period, previousPeriods),
          eq(quotations.region, region),
          eq(products.category, category),
          eq(quotations.status, 'approved'),
          sql`${quoteItems.approvedPrice} IS NOT NULL`
        )
      )
      .orderBy(desc(quotations.period), desc(quoteItems.updatedAt));

    console.log(`[getPreviousApprovedPrices] Found ${previousApprovedPrices?.length || 0} previous approved prices`);

    // Build a map with the most recent approved price per product
    const pricesMap = new Map<number, { price: number; period: string }>();

    if (Array.isArray(previousApprovedPrices)) {
      previousApprovedPrices.forEach(item => {
        if (item?.productId && item?.approvedPrice && !pricesMap.has(item.productId)) {
          pricesMap.set(item.productId, {
            price: Number(item.approvedPrice),
            period: item.period || 'unknown'
          });
        }
      });
    }

    console.log(`[getPreviousApprovedPrices] Returning ${pricesMap.size} unique previous approved prices`);
    return pricesMap;

  } catch (error) {
    console.error("Error in getPreviousApprovedPrices:", error);
    return new Map();
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
 * Excludes cancelled quotations to show only actionable data
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
      .where(
        and(
          eq(quotations.period, period),
          sql`${quotations.status} != 'cancelled'`
        )
      )
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
 * Excludes cancelled quotations to show only actionable data
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
          eq(products.status, 'active'),
          sql`${quotations.status} != 'cancelled'`
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

// Export target price file validation schema
const ExportTargetPriceSchema = z.object({
  period: z.string().min(1, "Kỳ báo giá là bắt buộc"),
  region: z.string().min(1, "Khu vực là bắt buộc"),
  category: z.string().optional(),
});

/**
 * Export target price file based on comparison matrix data
 */
export async function exportTargetPriceFile(params: {
  period: string;
  region: string;
  category?: string;
}): Promise<{
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    console.log("[exportTargetPriceFile] Starting export with params:", params);

    // Validate input
    const validatedData = ExportTargetPriceSchema.parse(params);
    const { period, region, category } = validatedData;

    // Get comparison matrix data
    const matrixData = await getComparisonMatrix({ period, region, category });

    if (!matrixData || matrixData.products.length === 0) {
      throw new Error("Không có dữ liệu sản phẩm để xuất file");
    }

    // 1. Extract best prices for each product
    const targetPriceData = matrixData.products.map(product => {
      const bestSupplier = matrixData.availableSuppliers.find(s => s.id === product.bestSupplierId);

      return {
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        quantity: product.quantity,
        currentBestPrice: product.bestPrice || 0,
        bestSupplier: bestSupplier?.name || null,
        targetPrice: product.bestPrice || 0, // Can be adjusted with business rules
        previousApprovedPrice: product.previousApprovedPrice || 0,
        notes: '', // For suppliers to add negotiation notes
      };
    });

    // 2. Generate Excel file using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Target Prices');

    // Set up column headers
    const headers = [
      'Mã sản phẩm', 'Tên sản phẩm', 'Đơn vị', 'Số lượng',
      'Giá tốt nhất hiện tại', 'NCC giá tốt nhất', 'Giá mục tiêu',
      'Giá đã duyệt kỳ trước', 'Ghi chú của NCC'
    ];

    // Add headers with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data rows
    targetPriceData.forEach(item => {
      const row = worksheet.addRow([
        item.productCode,
        item.productName,
        item.unit,
        item.quantity,
        item.currentBestPrice,
        item.bestSupplier,
        item.targetPrice,
        item.previousApprovedPrice,
        item.notes
      ]);

      // Add borders to data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.header) {
        const maxLength = Math.max(
          column.header.toString().length,
          ...worksheet.getColumn(column.letter).values
            .slice(1) // Skip header
            .map(val => val ? val.toString().length : 0)
        );
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // 3. Generate file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 4. Create filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
    const fileName = `target-prices-${period}-${region}${category ? `-${category}` : ''}-${timestamp}.xlsx`;

    // 5. For now, return the buffer as base64 (in a real implementation, save to temp storage)
    const base64Data = Buffer.from(buffer).toString('base64');
    const downloadUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;

    console.log(`[exportTargetPriceFile] Generated Excel file with ${targetPriceData.length} products`);

    return {
      success: true,
      downloadUrl,
      fileName
    };

  } catch (error) {
    console.error("Error in exportTargetPriceFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi khi xuất file giá mục tiêu"
    };
  }
}

// Helper function placeholder (would save to actual temp storage in production)
async function saveToTempStorage(buffer: Buffer, fileName: string): Promise<string> {
  // In a real implementation, this would save to AWS S3, local storage, etc.
  // For now, return a data URL
  const base64Data = Buffer.from(buffer).toString('base64');
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;
}