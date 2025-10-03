"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import archiver from "archiver";
import { writeFile } from "fs/promises";
import { join } from "path";
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
  type Product,
} from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import {
  calculateComparisonMatrix,
  type PriceItem,
  type ComparisonMatrix,
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
    throw new Error(
      "Unauthorized: Bạn cần đăng nhập để thực hiện hành động này"
    );
  }

  // TODO: Implement proper role checking for manager-level operations
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
    const { period, region, categories } = validatedFilters;

    console.log(
      `[getComparisonMatrix] Starting comparison for period: ${period}, region: ${region}, categories: ${categories.join(
        ", "
      )}`
    );

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
        basePrice: products.basePrice, // Source of truth for "Giá cơ sở"
      })
      .from(products)
      .where(
        and(
          inArray(products.category, categories),
          eq(products.status, "active")
        )
      )
      .orderBy(products.productCode);

    console.log(
      `[getComparisonMatrix] Found ${
        allProducts?.length || 0
      } products in categories: ${categories.join(", ")}`
    );

    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      console.log(
        `[getComparisonMatrix] No products found, returning empty matrix`
      );
      return {
        products: [],
        suppliers: [],
        period,
        region,
        category: categories.join(", "),
        lastUpdated: new Date(),
        groupedOverview: { regions: [] },
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
          eq(suppliers.status, "active")
        )
      )
      .orderBy(suppliers.supplierCode);

    console.log(
      `[getComparisonMatrix] Found ${
        allSuppliers?.length || 0
      } suppliers with quotations`
    );

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
          inArray(products.category, categories),
          eq(kitchenPeriodDemands.status, "active")
        )
      );

    console.log(
      `[getComparisonMatrix] Found ${
        kitchenDemands?.length || 0
      } kitchen demands`
    );

    // STEP 4: Initialize the matrix structure (Initialize Phase)
    console.log(`[getComparisonMatrix] Initializing matrix structure...`);

    const matrixProducts = [];
    const matrixSuppliers = [];

    // Create kitchen demands lookup for efficient access
    const kitchenDemandsMap = new Map();
    if (Array.isArray(kitchenDemands)) {
      kitchenDemands.forEach((demand) => {
        if (demand?.productId && demand?.quantity !== undefined) {
          kitchenDemandsMap.set(demand.productId, Number(demand.quantity) || 1);
        }
      });
    }

    // Initialize all products with default structure
    allProducts.forEach((product) => {
      if (!product?.id) {
        console.warn(`[getComparisonMatrix] Invalid product data:`, product);
        return;
      }

      const quantity =
        kitchenDemandsMap.get(product.id) || Number(product.baseQuantity) || 1;
      const quantitySource = kitchenDemandsMap.has(product.id)
        ? "kitchen_demand"
        : "base_quantity";

      matrixProducts.push({
        productId: product.id,
        productCode: product.productCode || "",
        productName: product.name || "",
        specification: product.specification || "",
        unit: product.unit || "",
        category: product.category || "", // Add category field
        quantity,
        quantitySource,
        baseQuantity: Number(product.baseQuantity) || 1,
        basePrice: product.basePrice ? Number(product.basePrice) : null, // Static reference price from products table
        suppliers: {}, // Will be populated with supplier data
        bestSupplierId: undefined,
        bestPrice: undefined,
        previousApprovedPrice: undefined, // Will be populated later
      });
    });

    // Initialize supplier statistics
    if (Array.isArray(allSuppliers)) {
      allSuppliers.forEach((supplier) => {
        if (!supplier?.id) {
          console.warn(
            `[getComparisonMatrix] Invalid supplier data:`,
            supplier
          );
          return;
        }

        matrixSuppliers.push({
          id: supplier.id,
          code: supplier.supplierCode || "",
          name: supplier.name || "",
          totalProducts: 0,
          quotedProducts: 0,
          coveragePercentage: 0,
        });
      });
    }

    console.log(
      `[getComparisonMatrix] Initialized matrix with ${matrixProducts.length} products and ${matrixSuppliers.length} suppliers`
    );

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
          inArray(products.category, categories),
          eq(suppliers.status, "active")
        )
      );

    console.log(
      `[getComparisonMatrix] Found ${
        quotationData?.length || 0
      } quotation items to populate`
    );

    // Create lookup maps for efficient population
    const productMap = new Map();
    matrixProducts.forEach((product, index) => {
      productMap.set(product.productId, index);
    });

    const supplierMap = new Map();
    matrixSuppliers.forEach((supplier) => {
      supplierMap.set(supplier.id, supplier);
    });

    // Populate the matrix with quotation data
    if (Array.isArray(quotationData)) {
      quotationData.forEach((row) => {
        if (!row?.productId || !row?.supplierId) {
          console.warn(`[getComparisonMatrix] Invalid quotation row:`, row);
          return;
        }

        const productIndex = productMap.get(row.productId);
        if (productIndex === undefined) {
          console.warn(
            `[getComparisonMatrix] Product not found in matrix:`,
            row.productId
          );
          return;
        }

        const product = matrixProducts[productIndex];
        if (!product) {
          console.warn(
            `[getComparisonMatrix] Product at index ${productIndex} is undefined`
          );
          return;
        }

        // Determine the effective price (priority: approved > negotiated > initial)
        const initialPrice = row.initialPrice
          ? Number(row.initialPrice)
          : undefined;
        const negotiatedPrice = row.negotiatedPrice
          ? Number(row.negotiatedPrice)
          : undefined;
        const approvedPrice = row.approvedPrice
          ? Number(row.approvedPrice)
          : undefined;

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
          supplierCode: row.supplierCode || "",
          supplierName: row.supplierName || "",
          initialPrice,
          negotiatedPrice,
          approvedPrice,
          vatRate,
          currency: row.currency || "VND",
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
    console.log(
      `[getComparisonMatrix] Calculating best prices and supplier coverage...`
    );

    matrixProducts.forEach((product) => {
      const supplierIds = Object.keys(product.suppliers).map(Number);
      let bestPrice = Infinity;
      let bestSupplierId = undefined;

      // Find best price among suppliers with valid prices
      supplierIds.forEach((supplierId) => {
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
    matrixSuppliers.forEach((supplier) => {
      supplier.totalProducts = matrixProducts.length;
      supplier.coveragePercentage =
        matrixProducts.length > 0
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
          eq(suppliers.status, "active")
        )
      );

    // STEP 7b: HYPER-DEFENSIVE DATABASE QUERIES WITH MANUAL JOINS
    console.log(
      `[getComparisonMatrix] === STARTING HYPER-DEFENSIVE DATA FETCHING ===`
    );

    // Query 1: Get ALL active suppliers first
    let allActiveSuppliers;
    try {
      console.log(`[getComparisonMatrix] Step 1: Fetching active suppliers...`);
      allActiveSuppliers = await db
        .select({
          id: suppliers.id,
          supplierCode: suppliers.supplierCode,
          name: suppliers.name,
          status: suppliers.status,
        })
        .from(suppliers)
        .where(eq(suppliers.status, "active"));

      console.log(
        `[getComparisonMatrix] Step 1 RESULT: Found ${allActiveSuppliers.length} active suppliers`
      );
      if (allActiveSuppliers.length > 0) {
        console.log(
          `[getComparisonMatrix] Step 1 SAMPLE:`,
          allActiveSuppliers[0]
        );
      }
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 1 - fetching suppliers:",
        error
      );
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    // Query 2: Get regional quotations separately
    let regionalQuotations;
    try {
      console.log(
        `[getComparisonMatrix] Step 2: Fetching regional quotations for period=${period}, region=${region}, categories=${categories.join(
          ", "
        )}...`
      );

      // Build WHERE conditions for quotations (category filtering is handled at product level)
      const quotationConditions = [
        eq(quotations.period, period),
        eq(quotations.region, region),
      ];

      regionalQuotations = await db
        .select({
          id: quotations.id,
          supplierId: quotations.supplierId,
          status: quotations.status,
          updatedAt: quotations.updatedAt,
          period: quotations.period,
          region: quotations.region,
        })
        .from(quotations)
        .where(and(...quotationConditions));

      console.log(
        `[getComparisonMatrix] Step 2 RESULT: Found ${regionalQuotations.length} regional quotations`
      );
      if (regionalQuotations.length > 0) {
        console.log(
          `[getComparisonMatrix] Step 2 SAMPLE:`,
          regionalQuotations[0]
        );
      }
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 2 - fetching quotations:",
        error
      );
      throw new Error(`Failed to fetch quotations: ${error.message}`);
    }

    // Query 3: Get quotation statistics separately
    let allQuotationStats;
    try {
      console.log(
        `[getComparisonMatrix] Step 3: Fetching quotation statistics...`
      );
      allQuotationStats = await db
        .select({
          quotationId: quotations.id,
          quotationStatus: quotations.status,
          supplierId: quotations.supplierId,
          supplierCode: suppliers.supplierCode,
          supplierName: suppliers.name,
          supplierStatus: suppliers.status,
        })
        .from(quotations)
        .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(
          and(eq(quotations.region, region), eq(suppliers.status, "active"))
        );

      console.log(
        `[getComparisonMatrix] Step 3 RESULT: Found ${allQuotationStats.length} quotation statistics`
      );
      if (allQuotationStats.length > 0) {
        console.log(
          `[getComparisonMatrix] Step 3 SAMPLE:`,
          allQuotationStats[0]
        );
      }
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 3 - fetching stats:",
        error
      );
      throw new Error(`Failed to fetch quotation stats: ${error.message}`);
    }

    // MANUAL JOIN PROCESS: Build supplier stats map manually
    const supplierStatsMap = new Map();

    try {
      console.log(
        `[getComparisonMatrix] Step 4: Building supplier stats map from ${allActiveSuppliers.length} suppliers...`
      );

      // Initialize all active suppliers first
      allActiveSuppliers.forEach((supplier, index) => {
        try {
          if (!supplier || typeof supplier !== "object") {
            console.warn(
              `[getComparisonMatrix] Step 4.${index}: Invalid supplier object:`,
              supplier
            );
            return;
          }

          if (!supplier.id) {
            console.warn(
              `[getComparisonMatrix] Step 4.${index}: Supplier missing ID:`,
              supplier
            );
            return;
          }

          const supplierData = {
            id: supplier.id,
            code: supplier.supplierCode || "",
            name: supplier.name || "",
            status: supplier.status || "unknown",
            // Initialize quotation data as null
            quotationId: null,
            quotationStatus: null,
            quotationSubmittedAt: null,
            quotationLastUpdated: null,
            // Initialize statistics
            totalQuotations: 0,
            pendingQuotations: 0,
            negotiationQuotations: 0,
            approvedQuotations: 0,
          };

          supplierStatsMap.set(supplier.id, supplierData);

          if (index < 3) {
            // Log first 3 for debugging
            console.log(
              `[getComparisonMatrix] Step 4.${index}: Added supplier ${supplier.id} (${supplier.supplierCode})`
            );
          }
        } catch (error) {
          console.error(
            `[getComparisonMatrix] ERROR in Step 4.${index} - processing supplier:`,
            error,
            supplier
          );
        }
      });

      console.log(
        `[getComparisonMatrix] Step 4 RESULT: Initialized ${supplierStatsMap.size} suppliers in stats map`
      );
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 4 - building supplier map:",
        error
      );
      throw new Error(`Failed to build supplier map: ${error.message}`);
    }

    try {
      console.log(
        `[getComparisonMatrix] Step 5: Overlaying regional quotation data from ${regionalQuotations.length} quotations...`
      );

      // Overlay regional quotation data
      regionalQuotations.forEach((quotation, index) => {
        try {
          if (!quotation || typeof quotation !== "object") {
            console.warn(
              `[getComparisonMatrix] Step 5.${index}: Invalid quotation object:`,
              quotation
            );
            return;
          }

          if (!quotation.supplierId) {
            console.warn(
              `[getComparisonMatrix] Step 5.${index}: Quotation missing supplierId:`,
              quotation
            );
            return;
          }

          const supplierData = supplierStatsMap.get(quotation.supplierId);
          if (supplierData) {
            // Safely update quotation data
            supplierData.quotationId = quotation.id ?? null;
            supplierData.quotationStatus = quotation.status ?? null;
            supplierData.quotationSubmittedAt = null; // submittedAt field doesn't exist in current schema
            supplierData.quotationLastUpdated = quotation.updatedAt ?? null;

            if (index < 3) {
              // Log first 3 for debugging
              console.log(
                `[getComparisonMatrix] Step 5.${index}: Updated supplier ${quotation.supplierId} with quotation ${quotation.id}`
              );
            }
          } else {
            console.warn(
              `[getComparisonMatrix] Step 5.${index}: No supplier found for quotation supplier ID: ${quotation.supplierId}`
            );
          }
        } catch (error) {
          console.error(
            `[getComparisonMatrix] ERROR in Step 5.${index} - processing quotation:`,
            error,
            quotation
          );
        }
      });

      console.log(
        `[getComparisonMatrix] Step 5 RESULT: Processed ${regionalQuotations.length} regional quotations`
      );
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 5 - overlaying quotations:",
        error
      );
      throw new Error(`Failed to overlay quotation data: ${error.message}`);
    }

    try {
      console.log(
        `[getComparisonMatrix] Step 6: Computing statistics from ${allQuotationStats.length} quotation records...`
      );

      // Populate statistics from all quotations
      allQuotationStats.forEach((stat, index) => {
        try {
          if (!stat || typeof stat !== "object") {
            console.warn(
              `[getComparisonMatrix] Step 6.${index}: Invalid stat object:`,
              stat
            );
            return;
          }

          if (!stat.supplierId) {
            console.warn(
              `[getComparisonMatrix] Step 6.${index}: Stat missing supplierId:`,
              stat
            );
            return;
          }

          const supplierData = supplierStatsMap.get(stat.supplierId);
          if (supplierData) {
            supplierData.totalQuotations++;

            switch (stat.quotationStatus) {
              case "pending":
                supplierData.pendingQuotations++;
                break;
              case "negotiation":
                supplierData.negotiationQuotations++;
                break;
              case "approved":
                supplierData.approvedQuotations++;
                break;
              default:
                console.debug(
                  `[getComparisonMatrix] Step 6.${index}: Unknown status: ${stat.quotationStatus}`
                );
                break;
            }

            if (index < 3) {
              // Log first 3 for debugging
              console.log(
                `[getComparisonMatrix] Step 6.${index}: Updated stats for supplier ${stat.supplierId}, total: ${supplierData.totalQuotations}`
              );
            }
          } else {
            console.warn(
              `[getComparisonMatrix] Step 6.${index}: No supplier found for stat supplier ID: ${stat.supplierId}`
            );
          }
        } catch (error) {
          console.error(
            `[getComparisonMatrix] ERROR in Step 6.${index} - processing stat:`,
            error,
            stat
          );
        }
      });

      console.log(
        `[getComparisonMatrix] Step 6 RESULT: Computed statistics for ${supplierStatsMap.size} suppliers`
      );
    } catch (error) {
      console.error(
        "[getComparisonMatrix] CRITICAL ERROR in Step 6 - computing statistics:",
        error
      );
      throw new Error(`Failed to compute statistics: ${error.message}`);
    }

    console.log(
      `[getComparisonMatrix] === HYPER-DEFENSIVE DATA FETCHING COMPLETE ===`
    );

    // STEP 8: Get previous approved prices and enhance product data with variance
    console.log(`[getComparisonMatrix] Fetching previous approved prices and calculating variance...`);

    // Get previous approved prices for comparison (now returns both best and per-supplier prices)
    const { bestPrices, supplierPrices } = await getPreviousApprovedPrices(
      period,
      region,
      categories
    );

    // Add previous approved price to each product and calculate variance for each supplier
    matrixProducts.forEach((product) => {
      const previousPrice = bestPrices.get(product.productId);
      if (previousPrice) {
        product.previousApprovedPrice = previousPrice.price;
      }

      // Calculate variance percentage for each supplier
      Object.keys(product.suppliers).forEach((supplierIdStr) => {
        const supplierId = parseInt(supplierIdStr);
        const supplierData = product.suppliers[supplierId];

        if (supplierData.hasPrice && previousPrice && previousPrice.price > 0) {
          const currentPrice = supplierData.pricePerUnit;
          const prevPrice = previousPrice.price;

          // Add supplier-specific previous price
          const supplierPriceKey = `${product.productId}-${supplierId}`;
          const previousSupplierPrice = supplierPrices.get(supplierPriceKey);
          if (previousSupplierPrice) {
            supplierData.previousPriceFromThisSupplier = previousSupplierPrice;
          }

          // Calculate percentage variance
          const variancePercentage = ((currentPrice - prevPrice) / prevPrice) * 100;

          // Determine trend (considering 0.5% as stable threshold)
          let varianceTrend: 'up' | 'down' | 'stable' = 'stable';
          if (variancePercentage > 0.5) {
            varianceTrend = 'up';
          } else if (variancePercentage < -0.5) {
            varianceTrend = 'down';
          }

          // Add variance data to supplier
          supplierData.variancePercentage = variancePercentage;
          supplierData.varianceTrend = varianceTrend;
        }
      });
    });

    // STEP 9: Calculate Grouped Overview (Region > Category > Supplier)
    console.log(`[getComparisonMatrix] Calculating grouped overview metrics (Region > Category > Supplier)...`);

    // Create nested map: Region -> Category -> Supplier -> Data
    const regionCategorySupplierMap = new Map<string, Map<string, Map<number, any>>>();

    matrixProducts.forEach((product) => {
      // For each product, loop through its suppliers
      Object.keys(product.suppliers).forEach((supplierIdStr) => {
        const supplierId = parseInt(supplierIdStr);
        const supplierData = product.suppliers[supplierId];

        // Skip suppliers without prices
        if (!supplierData.hasPrice) return;

        // Initialize nested structure if needed
        if (!regionCategorySupplierMap.has(region)) {
          regionCategorySupplierMap.set(region, new Map());
        }
        const categoryMap = regionCategorySupplierMap.get(region)!;

        if (!categoryMap.has(product.category)) {
          categoryMap.set(product.category, new Map());
        }
        const supplierMap = categoryMap.get(product.category)!;

        if (!supplierMap.has(supplierId)) {
          // Get quotation status for this supplier
          const supplierInfo = supplierStatsMap.get(supplierId);
          const quotationStatus = supplierInfo?.quotationStatus || null;

          supplierMap.set(supplierId, {
            supplierId,
            supplierCode: supplierData.supplierCode,
            supplierName: supplierData.supplierName,
            productCount: 0,
            totalBaseValue: 0,
            totalPreviousValue: 0,
            totalInitialValue: 0,
            totalCurrentValue: 0,
            hasAnyPreviousData: false,
            quotationStatus,
          });
        }

        const supplierAgg = supplierMap.get(supplierId)!;

        // Increment product count
        supplierAgg.productCount++;

        // Use the static base price from products table (source of truth)
        const basePrice = product.basePrice || 0;

        // Current effective price for this supplier
        const currentPrice = supplierData.pricePerUnit;
        const initialPrice = supplierData.initialPrice || 0;

        // Use base_quantity consistently for all calculations
        supplierAgg.totalBaseValue += basePrice * product.baseQuantity;
        supplierAgg.totalInitialValue += initialPrice * product.baseQuantity;
        supplierAgg.totalCurrentValue += currentPrice * product.baseQuantity;

        // Use supplier-specific previous price (not the best price from previous period)
        if (supplierData.previousPriceFromThisSupplier && supplierData.previousPriceFromThisSupplier > 0) {
          supplierAgg.totalPreviousValue += supplierData.previousPriceFromThisSupplier * product.baseQuantity;
          supplierAgg.hasAnyPreviousData = true;
        }
      });
    });

    // Convert nested maps to GroupedOverview structure
    const groupedOverview: any = {
      regions: []
    };

    regionCategorySupplierMap.forEach((categoryMap, regionName) => {
      const regionOverview: any = {
        region: regionName,
        categories: []
      };

      categoryMap.forEach((supplierMap, categoryName) => {
        const categoryOverview: any = {
          category: categoryName,
          supplierPerformances: []
        };

        supplierMap.forEach((supplierAgg) => {
          // Calculate variances
          const varianceVsBase = {
            difference: supplierAgg.totalCurrentValue - supplierAgg.totalBaseValue,
            percentage: supplierAgg.totalBaseValue > 0
              ? ((supplierAgg.totalCurrentValue - supplierAgg.totalBaseValue) / supplierAgg.totalBaseValue) * 100
              : 0,
          };

          const varianceVsPrevious = supplierAgg.hasAnyPreviousData ? {
            difference: supplierAgg.totalCurrentValue - supplierAgg.totalPreviousValue,
            percentage: supplierAgg.totalPreviousValue > 0
              ? ((supplierAgg.totalCurrentValue - supplierAgg.totalPreviousValue) / supplierAgg.totalPreviousValue) * 100
              : 0,
          } : null;

          const varianceVsInitial = {
            difference: supplierAgg.totalCurrentValue - supplierAgg.totalInitialValue,
            percentage: supplierAgg.totalInitialValue > 0
              ? ((supplierAgg.totalCurrentValue - supplierAgg.totalInitialValue) / supplierAgg.totalInitialValue) * 100
              : 0,
          };

          categoryOverview.supplierPerformances.push({
            supplierId: supplierAgg.supplierId,
            supplierCode: supplierAgg.supplierCode,
            supplierName: supplierAgg.supplierName,
            productCount: supplierAgg.productCount,
            totalBaseValue: supplierAgg.totalBaseValue,
            totalPreviousValue: supplierAgg.hasAnyPreviousData ? supplierAgg.totalPreviousValue : null,
            totalInitialValue: supplierAgg.totalInitialValue,
            totalCurrentValue: supplierAgg.totalCurrentValue,
            varianceVsBase,
            varianceVsPrevious,
            varianceVsInitial,
            quotationStatus: supplierAgg.quotationStatus,
          });
        });

        // Sort suppliers by code
        categoryOverview.supplierPerformances.sort((a: any, b: any) =>
          a.supplierCode.localeCompare(b.supplierCode)
        );

        regionOverview.categories.push(categoryOverview);
      });

      // Sort categories alphabetically
      regionOverview.categories.sort((a: any, b: any) =>
        a.category.localeCompare(b.category)
      );

      groupedOverview.regions.push(regionOverview);
    });

    console.log(`[getComparisonMatrix] Grouped overview calculated: ${groupedOverview.regions.length} regions, ${groupedOverview.regions.reduce((sum: number, r: any) => sum + r.categories.length, 0)} categories`);

    const finalMatrix = {
      products: matrixProducts,
      suppliers: matrixSuppliers,
      period,
      region,
      category: categories.join(", "),
      lastUpdated: new Date(),
      groupedOverview,
      availableSuppliers: Array.from(supplierStatsMap.values()),
    };

    console.log(`[getComparisonMatrix] Final matrix structure:`, {
      productsCount: finalMatrix.products.length,
      suppliersCount: finalMatrix.suppliers.length,
      availableSuppliersCount: finalMatrix.availableSuppliers.length,
      groupedOverviewRegions: finalMatrix.groupedOverview.regions.length,
      sampleProduct: finalMatrix.products[0]
        ? {
            productId: finalMatrix.products[0].productId,
            productCode: finalMatrix.products[0].productCode,
            suppliersWithQuotes: Object.keys(finalMatrix.products[0].suppliers)
              .length,
          }
        : "No products",
    });

    return finalMatrix;
  } catch (error) {
    console.error("Error in getComparisonMatrix:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Lỗi khi tải ma trận so sánh báo giá"
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
          inArray(quotations.status, ["pending", "negotiation"])
        )
      );

    if (quotationsToUpdate.length === 0) {
      throw new Error("Không tìm thấy báo giá hợp lệ để đàm phán");
    }

    // Update quotation statuses
    const validIds = quotationsToUpdate.map((q) => q.id);
    const updateResult = await db
      .update(quotations)
      .set({
        status: "negotiation",
        updateDate: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(quotations.id, validIds));

    // Get affected supplier names
    const affectedSuppliers = [
      ...new Set(quotationsToUpdate.map((q) => q.supplierName)),
    ];

    // Revalidate relevant pages
    revalidatePath("/so-sanh");
    revalidatePath("/bao-gia");

    return {
      success: `Đã chuyển ${quotationsToUpdate.length} báo giá sang trạng thái đàm phán`,
      updatedQuotations: quotationsToUpdate.length,
      affectedSuppliers,
    };
  } catch (error) {
    console.error("Error in batchNegotiation:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Lỗi khi thực hiện đàm phán hàng loạt"
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

    if (!["pending", "negotiation"].includes(quotation.status)) {
      throw new Error("Không thể đàm phán báo giá với trạng thái hiện tại");
    }

    // Update quotation status
    await db
      .update(quotations)
      .set({
        status: "negotiation",
        updateDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id));

    // Revalidate relevant pages
    revalidatePath("/so-sanh");
    revalidatePath("/bao-gia");

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

    if (quotation.status === "approved") {
      throw new Error("Báo giá đã được phê duyệt trước đó");
    }

    if (quotation.status === "cancelled") {
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
          totalApprovedValue +=
            finalApprovedPrice * (Number(item.quantity) || 1);

          // Log to price history
          await tx.insert(priceHistory).values({
            productId: item.productId,
            supplierId: quotation.supplierId,
            period: quotation.period,
            price: finalApprovedPrice,
            priceType: "approved",
            region: quotation.region,
          });

          loggedPriceHistory++;
        }
      }

      // Update quotation status
      await tx
        .update(quotations)
        .set({
          status: "approved",
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
    revalidatePath("/so-sanh");
    revalidatePath("/bao-gia");
    revalidatePath("/bang-gia");

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
 * Returns BOTH the best price per product AND per-supplier prices
 *
 * OPTIMIZED: Uses direct SQL query to find the most recent previous period
 */
async function getPreviousApprovedPrices(
  currentPeriod: string,
  region: string,
  categories: string[]
): Promise<{
  bestPrices: Map<number, { price: number; period: string }>;
  supplierPrices: Map<string, number>; // Key: "productId-supplierId", Value: price
}> {
  try {
    console.log(
      `[getPreviousApprovedPrices] Finding previous period for current: ${currentPeriod}, region: ${region}`
    );

    // STEP 1: Find the most recent previous period with approved quotations
    // Uses declarative SQL: SELECT MAX(period) WHERE period < currentPeriod AND status = 'approved'
    const previousPeriodResult = await db
      .select({
        period: quotations.period,
      })
      .from(quotations)
      .where(
        and(
          sql`${quotations.period} < ${currentPeriod}`,
          eq(quotations.region, region),
          eq(quotations.status, "approved")
        )
      )
      .orderBy(desc(quotations.period))
      .limit(1);

    // Handle case where no previous period exists
    if (!previousPeriodResult || previousPeriodResult.length === 0) {
      console.log(
        `[getPreviousApprovedPrices] No previous approved period found for ${currentPeriod} in region ${region}`
      );
      return {
        bestPrices: new Map(),
        supplierPrices: new Map(),
      };
    }

    const previousPeriod = previousPeriodResult[0].period;
    console.log(
      `[getPreviousApprovedPrices] Found previous period: ${previousPeriod}`
    );

    // STEP 2: Fetch all approved prices from the identified previous period
    const previousApprovedPrices = await db
      .select({
        productId: quoteItems.productId,
        supplierId: quotations.supplierId,
        approvedPrice: quoteItems.approvedPrice,
        period: quotations.period,
        updatedAt: quoteItems.updatedAt,
      })
      .from(quoteItems)
      .innerJoin(quotations, eq(quoteItems.quotationId, quotations.id))
      .innerJoin(products, eq(quoteItems.productId, products.id))
      .where(
        and(
          eq(quotations.period, previousPeriod),
          eq(quotations.region, region),
          inArray(products.category, categories),
          eq(quotations.status, "approved"),
          sql`${quoteItems.approvedPrice} IS NOT NULL`
        )
      )
      .orderBy(desc(quoteItems.updatedAt));

    console.log(
      `[getPreviousApprovedPrices] Found ${
        previousApprovedPrices?.length || 0
      } previous approved prices`
    );

    // Build TWO maps: one for best prices, one for per-supplier prices
    const bestPricesMap = new Map<number, { price: number; period: string }>();
    const supplierPricesMap = new Map<string, number>();

    if (Array.isArray(previousApprovedPrices)) {
      // First pass: collect all supplier-specific prices
      previousApprovedPrices.forEach((item) => {
        if (item?.productId && item?.supplierId && item?.approvedPrice) {
          const key = `${item.productId}-${item.supplierId}`;
          const price = Number(item.approvedPrice);

          // Only keep the most recent price for each product-supplier combination
          if (!supplierPricesMap.has(key)) {
            supplierPricesMap.set(key, price);
          }
        }
      });

      // Second pass: find best price per product
      const productPricesMap = new Map<number, number[]>();
      previousApprovedPrices.forEach((item) => {
        if (item?.productId && item?.approvedPrice) {
          if (!productPricesMap.has(item.productId)) {
            productPricesMap.set(item.productId, []);
          }
          productPricesMap.get(item.productId)!.push(Number(item.approvedPrice));
        }
      });

      // Find the minimum price for each product
      productPricesMap.forEach((prices, productId) => {
        if (prices.length > 0) {
          const bestPrice = Math.min(...prices);
          const item = previousApprovedPrices.find(
            p => p.productId === productId && Number(p.approvedPrice) === bestPrice
          );
          bestPricesMap.set(productId, {
            price: bestPrice,
            period: item?.period || "unknown",
          });
        }
      });
    }

    console.log(
      `[getPreviousApprovedPrices] Returning ${bestPricesMap.size} best prices and ${supplierPricesMap.size} supplier-specific prices`
    );
    return {
      bestPrices: bestPricesMap,
      supplierPrices: supplierPricesMap,
    };
  } catch (error) {
    console.error("Error in getPreviousApprovedPrices:", error);
    return {
      bestPrices: new Map(),
      supplierPrices: new Map(),
    };
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
      .where(eq(products.status, "active"))
      .orderBy(products.category);

    return categories.map((c) => c.category);
  } catch (error) {
    console.error("Error in getAvailableCategories:", error);
    throw new Error("Lỗi khi tải danh sách nhóm hàng");
  }
}

/**
 * Get quotation summary for comparison page filters
 */
export async function getQuotationSummary(
  period: string,
  region: string
): Promise<{
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
      .where(and(eq(quotations.period, period), eq(quotations.region, region)));

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
      .map((r) => r.region)
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
          eq(products.status, "active"),
          sql`${quotations.status} != 'cancelled'`
        )
      )
      .orderBy(products.category);

    return categories
      .map((c) => c.category)
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
  categories: z.array(z.string()).optional(),
});

/**
 * Export target price file based on comparison matrix data
 */
export async function exportTargetPriceFile(params: {
  period: string;
  region: string;
  categories?: string[];
}): Promise<Blob> {
  try {
    console.log("[exportTargetPriceFile] Starting export with params:", params);

    // Validate input
    const validatedData = ExportTargetPriceSchema.parse(params);
    const { period, region, categories } = validatedData;

    // Get comparison matrix data
    const matrixData = await getComparisonMatrix({
      period,
      region,
      categories: categories || [],
    });

    if (!matrixData || matrixData.products.length === 0) {
      throw new Error("Không có dữ liệu sản phẩm để xuất file");
    }

    // 1. Extract best prices for each product
    const targetPriceData = matrixData.products.map((product) => {
      const bestSupplier = matrixData.availableSuppliers.find(
        (s) => s.id === product.bestSupplierId
      );

      return {
        productCode: product.productCode,
        productName: product.productName,
        unit: product.unit,
        quantity: product.quantity,
        currentBestPrice: product.bestPrice || 0,
        bestSupplier: bestSupplier?.name || null,
        targetPrice: product.bestPrice || 0, // Can be adjusted with business rules
        previousApprovedPrice: product.previousApprovedPrice || 0,
        notes: "", // For suppliers to add negotiation notes
      };
    });

    // 2. Generate Excel file using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Target Prices");

    // Set up column headers
    const headers = [
      "Mã sản phẩm",
      "Tên sản phẩm",
      "Đơn vị",
      "Số lượng",
      "Giá tốt nhất hiện tại",
      "NCC giá tốt nhất",
      "Giá mục tiêu",
      "Giá đã duyệt kỳ trước",
      "Ghi chú của NCC",
    ];

    // Add headers with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    targetPriceData.forEach((item) => {
      const row = worksheet.addRow([
        item.productCode,
        item.productName,
        item.unit,
        item.quantity,
        item.currentBestPrice,
        item.bestSupplier,
        item.targetPrice,
        item.previousApprovedPrice,
        item.notes,
      ]);

      // Add borders to data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.header) {
        const maxLength = Math.max(
          column.header.toString().length,
          ...worksheet
            .getColumn(column.letter)
            .values.slice(1) // Skip header
            .map((val) => (val ? val.toString().length : 0))
        );
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // 3. Generate file buffer and return as Blob
    const buffer = await workbook.xlsx.writeBuffer();

    console.log(
      `[exportTargetPriceFile] Generated Excel file with ${targetPriceData.length} products`
    );

    // Return as Blob for direct download
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch (error) {
    console.error("Error in exportTargetPriceFile:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi xuất file giá mục tiêu"
    );
  }
}

/**
 * Initiate batch negotiation and export target price files (one per supplier, zipped)
 * This combines two operations: batch negotiation + export separate Excel files per supplier
 */
export async function initiateBatchNegotiationAndExport(params: {
  period: string;
  region: string;
  categories?: string[];
}): Promise<{ success: true; downloadPath: string }> {
  try {
    console.log(
      "[initiateBatchNegotiationAndExport] Starting with params:",
      params
    );

    // Authorization check
    await checkManagerRole();

    // Validate input
    const validatedData = ExportTargetPriceSchema.parse(params);
    const { period, region, categories } = validatedData;

    // Step 1: Get comparison matrix data first to identify quotations in current view
    const matrixData = await getComparisonMatrix({
      period,
      region,
      categories: categories || [],
    });

    if (!matrixData || matrixData.availableSuppliers.length === 0) {
      throw new Error("Không có dữ liệu nhà cung cấp để thực hiện");
    }

    if (!matrixData.products || matrixData.products.length === 0) {
      throw new Error("Không có dữ liệu sản phẩm để xuất file");
    }

    // Step 2: Extract pending quotation IDs from matrixData
    const pendingQuotationIds = matrixData.availableSuppliers
      .filter(
        (supplier) =>
          supplier.quotationId &&
          supplier.quotationId > 0 &&
          supplier.quotationStatus === "pending"
      )
      .map((supplier) => supplier.quotationId!)
      .filter((id, index, array) => array.indexOf(id) === index); // Remove duplicates

    console.log(
      `[initiateBatchNegotiationAndExport] Found ${pendingQuotationIds.length} pending quotations from matrix data`
    );

    // Step 3: Perform efficient batch status update using single UPDATE query
    if (pendingQuotationIds.length > 0) {
      await db
        .update(quotations)
        .set({
          status: "negotiation",
          updateDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(quotations.id, pendingQuotationIds),
            eq(quotations.status, "pending") // Additional safety check
          )
        );

      console.log(
        `[initiateBatchNegotiationAndExport] Updated ${pendingQuotationIds.length} quotations to negotiation status`
      );
    } else {
      console.log(
        `[initiateBatchNegotiationAndExport] No pending quotations found to update`
      );
    }

    // Step 4: Create a zip archive using archiver
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Step 5: Generate separate Excel file for each supplier
    for (const supplier of matrixData.availableSuppliers) {
      console.log(
        `[initiateBatchNegotiationAndExport] Generating Excel for supplier: ${supplier.code}`
      );

      // Filter products that this supplier has quoted
      const supplierProducts = matrixData.products.filter(
        (product) => product.suppliers[supplier.id] !== undefined
      );

      if (supplierProducts.length === 0) {
        console.log(
          `[initiateBatchNegotiationAndExport] Supplier ${supplier.code} has no products, skipping`
        );
        continue;
      }

      // Create a new workbook for this supplier
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Target Prices");

      // Set up column headers
      const headers = [
        "Mã sản phẩm",
        "Tên sản phẩm",
        "Quy cách",
        "Đơn vị",
        "Giá mục tiêu",
      ];

      // Add headers with styling
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6E6FA" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Add data rows for this supplier's products
      supplierProducts.forEach((product) => {
        const supplierData = product.suppliers[supplier.id];
        const targetPrice = supplierData?.pricePerUnit || product.bestPrice || 0;

        const rowData = [
          product.productCode || "",
          product.productName || "",
          product.specification || "",
          product.unit || "",
          targetPrice,
        ];

        const row = worksheet.addRow(rowData);

        // Apply formatting to data cells
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Format price column (column 5) as number with thousand separators
          if (colNumber === 5 && typeof cell.value === "number") {
            cell.numFmt = "#,##0";
          }
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        if (column.header) {
          const maxLength = Math.max(
            column.header.toString().length,
            ...worksheet
              .getColumn(column.letter)
              .values.slice(1)
              .map((val) => (val ? val.toString().length : 0))
          );
          column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        }
      });

      // Generate Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Add to zip archive with unique filename
      const fileName = `${period}_${region}_${supplier.code}.xlsx`;
      archive.append(Buffer.from(buffer), { name: fileName });

      console.log(
        `[initiateBatchNegotiationAndExport] Added ${fileName} to archive with ${supplierProducts.length} products`
      );
    }

    // Step 6: Finalize the archive
    archive.finalize();

    // Step 7: Save zip to temporary directory
    const timestamp = Date.now();
    const zipFileName = `GiaMucTieu_${period}_${region}_${timestamp}.zip`;
    const zipFilePath = join(
      process.cwd(),
      "public",
      "tmp",
      zipFileName
    );

    // Collect archive data into buffer
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      archive.on("end", () => {
        const zipBuffer = Buffer.concat(chunks);
        writeFile(zipFilePath, zipBuffer)
          .then(() => resolve())
          .catch(reject);
      });
      archive.on("error", reject);
    });

    console.log(
      `[initiateBatchNegotiationAndExport] Saved zip file to: ${zipFilePath}`
    );

    // Revalidate relevant pages
    revalidatePath("/so-sanh");
    revalidatePath("/bao-gia");

    // Return download path for client-side download
    return {
      success: true,
      downloadPath: `/tmp/${zipFileName}`,
    };
  } catch (error) {
    console.error("Error in initiateBatchNegotiationAndExport:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Lỗi khi thực hiện đàm phán hàng loạt và xuất file"
    );
  }
}

/**
 * Approve multiple quotations with price finalization
 * Uses database transaction to ensure atomicity of status update and price finalization
 */
export async function approveMultipleQuotations(
  data: z.infer<typeof BatchNegotiationSchema>
): Promise<{
  success: string;
  approvedQuotations: number;
  affectedSuppliers: string[];
}> {
  try {
    console.log(
      "[approveMultipleQuotations] Starting approval process with:",
      data
    );

    // Authorization check - ensure user has approval permissions
    const user = await checkApprovalRole();

    // Validate input
    const validatedData = BatchNegotiationSchema.parse(data);
    const { quotationIds } = validatedData;

    if (quotationIds.length === 0) {
      throw new Error("Danh sách báo giá không được để trống");
    }

    console.log(
      `[approveMultipleQuotations] Processing ${quotationIds.length} quotation IDs`
    );

    // Get quotations that are eligible for approval
    const quotationsToApprove = await db
      .select({
        id: quotations.id,
        supplierId: quotations.supplierId,
        supplierCode: suppliers.supplierCode,
        supplierName: suppliers.name,
        status: quotations.status,
        period: quotations.period,
        region: quotations.region,
      })
      .from(quotations)
      .innerJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(
        and(
          inArray(quotations.id, quotationIds),
          inArray(quotations.status, ["pending", "negotiation"]) // Safety check - only approve quotations in valid statuses
        )
      );

    if (quotationsToApprove.length === 0) {
      throw new Error(
        "Không tìm thấy báo giá hợp lệ để phê duyệt (chỉ có thể phê duyệt báo giá ở trạng thái 'pending' hoặc 'negotiation')"
      );
    }

    console.log(
      `[approveMultipleQuotations] Found ${quotationsToApprove.length} valid quotations for approval`
    );

    // Extract quotation IDs for efficient batch update
    const validQuotationIds = quotationsToApprove.map((q) => q.id);

    // Execute approval in a transaction to ensure data integrity
    await db.transaction(async (tx) => {
      // STEP 1: Update quotations status to 'approved'
      await tx
        .update(quotations)
        .set({
          status: "approved",
          updateDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(quotations.id, validQuotationIds),
            inArray(quotations.status, ["pending", "negotiation"])
          )
        );

      console.log(
        `[approveMultipleQuotations] STEP 1: Updated ${quotationsToApprove.length} quotations to approved status`
      );

      // STEP 2: Finalize prices in quote_items
      // Set approved_price = COALESCE(negotiated_price, initial_price)
      await tx
        .update(quoteItems)
        .set({
          approvedPrice: sql`COALESCE(${quoteItems.negotiatedPrice}, ${quoteItems.initialPrice})`,
          approvedAt: new Date(),
          approvedBy: user.id,
        })
        .where(inArray(quoteItems.quotationId, validQuotationIds));

      console.log(
        `[approveMultipleQuotations] STEP 2: Finalized approved prices for all quote items in ${quotationsToApprove.length} quotations`
      );

      // STEP 3: Insert approved prices into price_history table for trend analysis
      // This is CRITICAL for the Price Trends feature to work correctly
      console.log(
        `[approveMultipleQuotations] STEP 3: Inserting approved prices into price_history...`
      );

      // Get all quote items with their newly approved prices
      const approvedItems = await tx
        .select({
          productId: quoteItems.productId,
          quotationId: quoteItems.quotationId,
          approvedPrice: quoteItems.approvedPrice,
          negotiatedPrice: quoteItems.negotiatedPrice,
          initialPrice: quoteItems.initialPrice,
        })
        .from(quoteItems)
        .where(inArray(quoteItems.quotationId, validQuotationIds));

      // Build price history records for batch insert
      const priceHistoryRecords = [];
      for (const item of approvedItems) {
        // Get quotation details for this item
        const quotation = quotationsToApprove.find(
          (q) => q.id === item.quotationId
        );

        if (!quotation) continue;

        // Calculate final approved price (same logic as STEP 2)
        const finalPrice =
          item.approvedPrice ||
          item.negotiatedPrice ||
          item.initialPrice;

        if (finalPrice && Number(finalPrice) > 0) {
          priceHistoryRecords.push({
            productId: item.productId,
            supplierId: quotation.supplierId,
            period: quotation.period,
            price: finalPrice,
            priceType: "approved" as const,
            region: quotation.region,
          });
        }
      }

      // Batch insert all price history records
      if (priceHistoryRecords.length > 0) {
        await tx.insert(priceHistory).values(priceHistoryRecords);
        console.log(
          `[approveMultipleQuotations] STEP 3: Inserted ${priceHistoryRecords.length} records into price_history`
        );
      } else {
        console.log(
          `[approveMultipleQuotations] STEP 3: No valid prices to insert into price_history`
        );
      }
    });

    console.log(
      `[approveMultipleQuotations] Transaction completed successfully`
    );

    // Get affected supplier names for response
    const affectedSuppliers = [
      ...new Set(quotationsToApprove.map((q) => q.supplierName)),
    ];

    // Revalidate relevant pages to refresh UI
    revalidatePath("/so-sanh");
    revalidatePath("/bao-gia");

    const result = {
      success: `Đã phê duyệt ${quotationsToApprove.length} báo giá từ ${affectedSuppliers.length} nhà cung cấp`,
      approvedQuotations: quotationsToApprove.length,
      affectedSuppliers,
    };

    console.log(`[approveMultipleQuotations] Completed successfully:`, result);
    return result;
  } catch (error) {
    console.error("Error in approveMultipleQuotations:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Lỗi khi phê duyệt báo giá hàng loạt"
    );
  }
}

/**
 * Helper function to check approval role (higher permission than manager)
 */
async function checkApprovalRole() {
  const user = await getUser();

  if (!user) {
    throw new Error(
      "Unauthorized: Bạn cần đăng nhập để thực hiện hành động này"
    );
  }

  // TODO: Implement proper role checking for approval-level operations
  // This should check for ADMIN_SUPER_ADMIN or higher roles
  // For now, assume all authenticated users have access

  return user;
}

// Helper function placeholder (would save to actual temp storage in production)
async function saveToTempStorage(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  // In a real implementation, this would save to AWS S3, local storage, etc.
  // For now, return a data URL
  const base64Data = Buffer.from(buffer).toString("base64");
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`;
}
