"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/drizzle";
import {
  quotations,
  quoteItems,
  suppliers,
  products,
  teams,
  priceHistory,
  type Quotation,
  type QuoteItem,
  type Supplier,
  type Product
} from "@/lib/db/schema";
import { getUser } from "@/lib/db/queries";
import { eq, and, inArray, desc, sql, like } from "drizzle-orm";
import { processExcelFile, type ParseResult } from "@/lib/utils/excel-parser";
import { getUserPermissions, type PermissionSet } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import {
  QuotationFiltersSchema,
  ImportQuotationsSchema,
  UpdateQuotationStatusSchema,
  type QuotationWithDetails,
  type QuotationDetailsWithItems,
  type ImportResult,
} from "@/lib/types/quotations.types";

// Validation schemas and types are imported from types file

// Types are imported from types file

// ==================== AUTHORIZATION HELPERS ====================

async function checkProcurementRole(requiredRoles: string[] = ['ADMIN_SUPER_ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_STAFF']) {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để thực hiện hành động này");
  }

  // TODO: Implement proper role checking based on team_members table
  // For now, we'll assume all authenticated users have access
  // In production, this should query the team_members table for the user's role

  return user;
}

async function checkManagerRole() {
  const user = await getUser();

  if (!user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để thực hiện hành động này");
  }

  // TODO: Implement proper role checking for manager-level operations
  // This should check for ADMIN_SUPER_ADMIN or PROCUREMENT_MANAGER roles

  return user;
}

// ==================== MAIN ACTIONS ====================

/**
 * Get quotations with filtering and pagination
 */
export async function getQuotations(filters?: z.infer<typeof QuotationFiltersSchema>) {
  try {
    // Authorization check
    await checkProcurementRole();

    // Validate filters
    const validatedFilters = QuotationFiltersSchema.parse(filters || {});
    const { period, region, supplierId, status, page, limit } = validatedFilters;

    // Build where conditions
    const whereConditions = [];

    if (period) {
      whereConditions.push(eq(quotations.period, period));
    }

    if (region) {
      whereConditions.push(eq(quotations.region, region));
    }

    if (supplierId) {
      whereConditions.push(eq(quotations.supplierId, supplierId));
    }

    if (status && status !== "all") {
      whereConditions.push(eq(quotations.status, status));
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get quotations with supplier and creator information
    const result = await db
      .select({
        id: quotations.id,
        quotationId: quotations.quotationId,
        period: quotations.period,
        region: quotations.region,
        status: quotations.status,
        quoteDate: quotations.quoteDate,
        updateDate: quotations.updateDate,
        createdAt: quotations.createdAt,
        updatedAt: quotations.updatedAt,
        supplier: {
          id: suppliers.id,
          supplierCode: suppliers.supplierCode,
          name: suppliers.name,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
        },
        creator: {
          id: sql<number>`COALESCE(${quotations.createdBy}, 0)`.as('creator_id'),
          name: sql<string>`COALESCE((SELECT name FROM users WHERE id = ${quotations.createdBy}), 'N/A')`.as('creator_name'),
          email: sql<string>`COALESCE((SELECT email FROM users WHERE id = ${quotations.createdBy}), 'N/A')`.as('creator_email'),
        },
        itemCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${quoteItems}
          WHERE ${quoteItems.quotationId} = ${quotations.id}
        )`.as('item_count'),
      })
      .from(quotations)
      .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quotations)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return {
      data: result as QuotationWithDetails[],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      }
    };

  } catch (error) {
    console.error("Error in getQuotations:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi tải danh sách báo giá"
    );
  }
}

/**
 * Import quotations from Excel files
 */
export async function importQuotationsFromExcel(
  files: File[],
  importData: z.infer<typeof ImportQuotationsSchema>
): Promise<ImportResult> {
  try {
    // Authorization check
    const user = await checkProcurementRole();

    // Validate import data
    const validatedData = ImportQuotationsSchema.parse(importData);
    const { period, region, overwrite } = validatedData;

    const result: ImportResult = {
      success: false,
      totalFiles: files.length,
      processedFiles: 0,
      totalQuotations: 0,
      createdQuotations: 0,
      updatedQuotations: 0,
      totalItems: 0,
      errors: [],
      warnings: [],
    };

    if (files.length === 0) {
      result.errors.push("Không có file nào được chọn");
      return result;
    }

    // Process each file
    for (const file of files) {
      try {
        // Parse Excel file with region and period from import data
        const parseResult: ParseResult = await processExcelFile(file, region, period);

        if (!parseResult.success || !parseResult.data) {
          result.errors.push(`File ${file.name}: ${parseResult.errors.map(e => e.message).join(', ')}`);
          continue;
        }

        // Validate that region matches (period is now provided from form, not Excel)
        if (parseResult.data?.info?.region !== region) {
          result.errors.push(`File ${file.name}: Khu vực trong file (${parseResult.data?.info?.region || 'N/A'}) không khớp với khu vực đã chọn (${region})`);
          continue;
        }

        // Validate supplier exists
        const supplierCode = parseResult.data?.info?.supplierCode;
        if (!supplierCode) {
          result.errors.push(`File ${file.name}: Thiếu mã nhà cung cấp`);
          continue;
        }

        const [supplier] = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.supplierCode, supplierCode))
          .limit(1);

        if (!supplier) {
          result.errors.push(`File ${file.name}: Không tìm thấy nhà cung cấp với mã ${supplierCode}`);
          continue;
        }

        // Validate all products exist with input normalization
        if (!parseResult.data?.items) {
          result.errors.push(`File ${file.name}: Dữ liệu sản phẩm không hợp lệ`);
          continue;
        }

        const productCodes = parseResult.data.items.map(item => {
          if (!item?.productCode) {
            throw new Error('Product code is missing or invalid');
          }
          return item.productCode.trim().toUpperCase();
        });

        const existingProducts = await db
          .select()
          .from(products)
          .where(inArray(products.productCode, productCodes));

        const existingProductCodes = new Set(existingProducts.map(p => p.productCode?.trim().toUpperCase()).filter(Boolean));
        const missingProducts = [];
        const validProducts = [];

        // Granular validation with detailed reporting
        for (let i = 0; i < productCodes.length; i++) {
          const normalizedCode = productCodes[i];
          const originalItem = parseResult.data.items[i];

          if (existingProductCodes.has(normalizedCode)) {
            validProducts.push(normalizedCode);
          } else {
            missingProducts.push({
              code: originalItem.productCode,
              normalizedCode,
              row: i + 2 // Excel row number (accounting for header)
            });
          }
        }

        if (missingProducts.length > 0) {
          const errorDetails = missingProducts.map(p => `${p.code} (dòng ${p.row})`).join(', ');
          result.errors.push(`File ${file.name}: Không tìm thấy sản phẩm với mã: ${errorDetails}`);

          // Add warning if normalization might help
          if (missingProducts.some(p => p.code !== p.normalizedCode)) {
            result.warnings.push(`File ${file.name}: Một số mã sản phẩm đã được chuẩn hóa (loại bỏ khoảng trắng, chuyển thành chữ hoa) nhưng vẫn không tìm thấy`);
          }
          continue;
        }

        // Process the file in a transaction
        await db.transaction(async (tx) => {
          // Check for existing quotation
          const [existingQuotation] = await tx
            .select()
            .from(quotations)
            .where(
              and(
                eq(quotations.supplierId, supplier.id),
                eq(quotations.period, period),
                eq(quotations.region, region)
              )
            )
            .limit(1);

          let quotationId: number;
          let isUpdate = false;

          if (existingQuotation) {
            // Handle different update scenarios based on quotation status
            if (existingQuotation.status === 'negotiation') {
              // Intelligent update: Update negotiated prices for quotations in negotiation
              quotationId = existingQuotation.id;
              isUpdate = true;

              // Update quotation metadata
              await tx
                .update(quotations)
                .set({
                  quoteDate: parseResult.data?.info?.quoteDate ? new Date(parseResult.data.info.quoteDate) : null,
                  updateDate: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(quotations.id, existingQuotation.id));

              // For negotiation status, we'll update negotiated_price instead of replacing items
              // This will be handled in the item processing loop below
            } else if (existingQuotation.status === 'draft') {
              if (!overwrite) {
                throw new Error(`Báo giá đã tồn tại cho NCC ${supplier.supplierCode} trong kỳ ${period} tại ${region}. Vui lòng chọn "Ghi đè" để cập nhật.`);
              }

              // Update existing draft quotation (standard overwrite)
              await tx
                .update(quotations)
                .set({
                  quoteDate: parseResult.data?.info?.quoteDate ? new Date(parseResult.data.info.quoteDate) : null,
                  updateDate: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(quotations.id, existingQuotation.id));

              // Delete existing quote items for draft quotations
              await tx
                .delete(quoteItems)
                .where(eq(quoteItems.quotationId, existingQuotation.id));

              quotationId = existingQuotation.id;
              isUpdate = true;
            } else {
              // Cannot update quotations in 'approved', 'rejected', etc. status
              throw new Error(`Không thể cập nhật báo giá ở trạng thái '${existingQuotation.status}'. Chỉ có thể cập nhật báo giá ở trạng thái 'draft' hoặc 'negotiation'.`);
            }
          } else {
            // Create new quotation
            const [newQuotation] = await tx
              .insert(quotations)
              .values({
                quotationId: `Q-${supplier.supplierCode}-${period}-${region}`,
                period,
                supplierId: supplier.id,
                region,
                category: parseResult.data?.items?.[0]?.productCode?.substring(0, 2) || 'GEN', // Simple category logic
                quoteDate: parseResult.data?.info?.quoteDate ? new Date(parseResult.data.info.quoteDate) : null,
                status: 'pending',
                createdBy: user.id,
              })
              .returning({ id: quotations.id });

            quotationId = newQuotation.id;
          }

          // Create product code to ID mapping with normalization
          const productMap = new Map();
          existingProducts.forEach(p => {
            if (p.productCode) {
              productMap.set(p.productCode.trim().toUpperCase(), p.id);
            }
          });

          // Handle item processing based on quotation status
          if (existingQuotation && existingQuotation.status === 'negotiation') {
            // Update negotiated prices for existing items
            let updatedItemsCount = 0;
            for (const item of parseResult.data?.items || []) {
              if (!item?.productCode) {
                throw new Error('Invalid item data: missing productCode');
              }

              const normalizedCode = item.productCode.trim().toUpperCase();
              const productId = productMap.get(normalizedCode);

              if (!productId) {
                throw new Error(`Product mapping failed for code: ${item.productCode}`);
              }

              // Update negotiated price for existing quote item
              const updateResult = await tx
                .update(quoteItems)
                .set({
                  negotiatedPrice: item.initialPrice ?? 0, // New price goes to negotiatedPrice
                  negotiationRounds: sql`${quoteItems.negotiationRounds} + 1`,
                  lastNegotiatedAt: new Date(),
                  updatedAt: new Date(),
                  notes: item.notes || quoteItems.notes, // Preserve existing notes if new ones aren't provided
                })
                .where(
                  and(
                    eq(quoteItems.quotationId, quotationId),
                    eq(quoteItems.productId, productId)
                  )
                );

              updatedItemsCount++;
            }

            result.totalItems += updatedItemsCount;
            console.log(`Updated negotiated prices for ${updatedItemsCount} items in quotation ${quotationId}`);
          } else {
            // Insert new quote items (for new quotations or draft updates)
            const quoteItemsData = [];
            for (const item of parseResult.data?.items || []) {
              if (!item?.productCode) {
                throw new Error('Invalid item data: missing productCode');
              }

              const normalizedCode = item.productCode.trim().toUpperCase();
              const productId = productMap.get(normalizedCode);

              if (!productId) {
                throw new Error(`Product mapping failed for code: ${item.productCode}`);
              }

              quoteItemsData.push({
                quotationId,
                productId,
                quantity: item.quantity ?? 1,
                initialPrice: item.initialPrice ?? 0,
                vatPercentage: item.vatRate ?? 0,
                currency: 'VND',
                notes: item.notes || null,
              });
            }

            await tx.insert(quoteItems).values(quoteItemsData);
            result.totalItems += quoteItemsData.length;
          }

          // Update counters
          if (isUpdate) {
            result.updatedQuotations++;
          } else {
            result.createdQuotations++;
          }
        });

        result.processedFiles++;
        result.totalQuotations++;

        // Add any warnings from parsing
        if (parseResult.warnings.length > 0) {
          result.warnings.push(`File ${file.name}: ${parseResult.warnings.map(w => w.message).join(', ')}`);
        }

      } catch (error) {
        result.errors.push(`File ${file.name}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      }
    }

    result.success = result.processedFiles > 0 && result.errors.length === 0;

    // Revalidate the quotations page
    revalidatePath('/bao-gia');

    return result;

  } catch (error) {
    console.error("Error in importQuotationsFromExcel:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi import báo giá từ Excel"
    );
  }
}

/**
 * Get detailed quotation with all items - SIMPLIFIED "DUMB SERVER" VERSION
 * This function only fetches raw data - NO data transformation or type conversion
 * All presentation logic is handled by the client component
 */
export async function getQuotationDetails(id: number): Promise<QuotationDetailsWithItems | { error: string }> {
  try {
    // Authorization check
    await checkProcurementRole();

    // Get quotation with supplier and creator info - raw data only
    const [quotation] = await db
      .select({
        id: quotations.id,
        quotationId: quotations.quotationId,
        period: quotations.period,
        region: quotations.region,
        status: quotations.status,
        quoteDate: quotations.quoteDate,
        updateDate: quotations.updateDate,
        createdAt: quotations.createdAt,
        updatedAt: quotations.updatedAt,
        supplier: {
          id: suppliers.id,
          supplierCode: suppliers.supplierCode,
          name: suppliers.name,
          taxId: suppliers.taxId,
          address: suppliers.address,
          contactPerson: suppliers.contactPerson,
          phone: suppliers.phone,
          email: suppliers.email,
          status: suppliers.status,
        },
        creator: {
          id: sql<number>`COALESCE(${quotations.createdBy}, 0)`.as('creator_id'),
          name: sql<string>`COALESCE((SELECT name FROM users WHERE id = ${quotations.createdBy}), 'N/A')`.as('creator_name'),
          email: sql<string>`COALESCE((SELECT email FROM users WHERE id = ${quotations.createdBy}), 'N/A')`.as('creator_email'),
        },
      })
      .from(quotations)
      .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .where(eq(quotations.id, id))
      .limit(1);

    if (!quotation) {
      return { error: "Báo giá không tồn tại" };
    }

    // Get quote items with product info - raw data only, Drizzle returns decimals as strings
    const items = await db
      .select({
        id: quoteItems.id,
        quotationId: quoteItems.quotationId,
        productId: quoteItems.productId,
        quantity: quoteItems.quantity, // Returns as string (decimal from DB)
        initialPrice: quoteItems.initialPrice, // Returns as string (decimal from DB)
        negotiatedPrice: quoteItems.negotiatedPrice, // Returns as string (decimal from DB)
        approvedPrice: quoteItems.approvedPrice, // Returns as string (decimal from DB)
        vatPercentage: quoteItems.vatPercentage, // Returns as string (decimal from DB)
        currency: quoteItems.currency,
        negotiationRounds: quoteItems.negotiationRounds,
        lastNegotiatedAt: quoteItems.lastNegotiatedAt,
        approvedAt: quoteItems.approvedAt,
        approvedBy: quoteItems.approvedBy,
        notes: quoteItems.notes,
        createdAt: quoteItems.createdAt,
        updatedAt: quoteItems.updatedAt,
        product: {
          id: products.id,
          productCode: products.productCode,
          name: products.name,
          specification: products.specification,
          unit: products.unit,
          category: products.category,
          basePrice: products.basePrice, // Returns as string (decimal from DB)
          baseQuantity: products.baseQuantity, // Returns as string (decimal from DB)
        },
        baseQuantity: products.baseQuantity, // Future-proofing: Available for COALESCE with kitchen_period_demands
      })
      .from(quoteItems)
      .leftJoin(products, eq(quoteItems.productId, products.id))
      .where(eq(quoteItems.quotationId, id))
      .orderBy(products.productCode);

    // Return raw data - no transformation
    return {
      ...quotation,
      items,
    } as QuotationDetailsWithItems;

  } catch (error) {
    console.error("Error in getQuotationDetails:", error);
    return {
      error: error instanceof Error ? error.message : "Lỗi khi tải chi tiết báo giá"
    };
  }
}

/**
 * Update quotation status
 */
export async function updateQuotationStatus(
  data: z.infer<typeof UpdateQuotationStatusSchema>
): Promise<{ success: string }> {
  try {
    // Authorization check for status changes
    await checkManagerRole();

    // Validate input
    const validatedData = UpdateQuotationStatusSchema.parse(data);
    const { id, status } = validatedData;

    // Get current quotation
    const [currentQuotation] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, id))
      .limit(1);

    if (!currentQuotation) {
      throw new Error("Không tìm thấy báo giá");
    }

    // Validate status transition
    if (currentQuotation.status === 'approved' && status !== 'cancelled') {
      throw new Error("Không thể thay đổi trạng thái của báo giá đã được duyệt");
    }

    // Update quotation status
    await db
      .update(quotations)
      .set({
        status,
        updateDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id));

    // If status is being set to approved, log to price history
    if (status === 'approved') {
      // Get all quote items for this quotation
      const items = await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quotationId, id));

      // Log approved prices to price history
      const priceHistoryData = items
        .filter(item => item.approvedPrice !== null)
        .map(item => ({
          productId: item.productId,
          supplierId: currentQuotation.supplierId,
          period: currentQuotation.period,
          price: item.approvedPrice!,
          priceType: 'approved' as const,
          region: currentQuotation.region,
        }));

      if (priceHistoryData.length > 0) {
        await db.insert(priceHistory).values(priceHistoryData);
      }
    }

    // Revalidate relevant pages
    revalidatePath('/bao-gia');
    revalidatePath('/so-sanh');

    return { success: "Cập nhật trạng thái báo giá thành công" };

  } catch (error) {
    console.error("Error in updateQuotationStatus:", error);
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi cập nhật trạng thái báo giá"
    );
  }
}

/**
 * Cancel quotation (convenience function)
 */
export async function cancelQuotation(id: number): Promise<{ success: string }> {
  return updateQuotationStatus({ id, status: 'cancelled' });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get available regions from teams table
 */
export async function getAvailableRegions(): Promise<string[]> {
  try {
    await checkProcurementRole();

    const regions = await db
      .selectDistinct({ region: teams.region })
      .from(teams)
      .where(sql`${teams.region} IS NOT NULL AND ${teams.region} != ''`)
      .orderBy(teams.region);

    return regions.map(r => r.region).filter((region): region is string => Boolean(region));

  } catch (error) {
    console.error("Error in getAvailableRegions:", error);
    throw new Error("Lỗi khi tải danh sách khu vực");
  }
}

/**
 * Get available periods from quotations table
 */
export async function getAvailablePeriods(): Promise<string[]> {
  try {
    await checkProcurementRole();

    const periods = await db
      .selectDistinct({ period: quotations.period })
      .from(quotations)
      .orderBy(desc(quotations.period));

    return periods.map(p => p.period);

  } catch (error) {
    console.error("Error in getAvailablePeriods:", error);
    throw new Error("Lỗi khi tải danh sách kỳ báo giá");
  }
}

/**
 * Get available suppliers for dropdown
 */
export async function getAvailableSuppliers(): Promise<Array<{ id: number; code: string; name: string }>> {
  try {
    await checkProcurementRole();

    const supplierList = await db
      .select({
        id: suppliers.id,
        code: suppliers.supplierCode,
        name: suppliers.name,
      })
      .from(suppliers)
      .where(eq(suppliers.status, 'active'))
      .orderBy(suppliers.supplierCode);

    return supplierList.filter((supplier): supplier is { id: number; code: string; name: string } => Boolean(supplier.code));

  } catch (error) {
    console.error("Error in getAvailableSuppliers:", error);
    throw new Error("Lỗi khi tải danh sách nhà cung cấp");
  }
}

/**
 * Server Action to get current user's permissions
 * This allows Client Components to get permissions without importing server-only functions
 */
export async function getCurrentUserPermissions(): Promise<{
  success: boolean;
  permissions?: PermissionSet;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Không tìm thấy phiên đăng nhập",
      };
    }

    const permissions = await getUserPermissions(session.user.id);
    return {
      success: true,
      permissions,
    };
  } catch (error) {
    console.error("Error in getCurrentUserPermissions:", error);
    return {
      success: false,
      error: "Lỗi khi tải quyền người dùng",
    };
  }
}

/**
 * Get available categories from products
 */
export async function getAvailableCategories(): Promise<string[]> {
  try {
    const categories = await db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(eq(products.status, "active"));

    return categories.map(item => item.category).filter(Boolean).sort();
  } catch (error) {
    console.error("Error in getAvailableCategories:", error);
    return [];
  }
}

/**
 * Get the latest period from quotations table
 * Returns the most recent period value (MAX) or null if no quotations exist
 */
export async function getLatestPeriod(): Promise<string | null> {
  try {
    await checkProcurementRole();

    const result = await db
      .select({ maxPeriod: sql<string>`MAX(${quotations.period})` })
      .from(quotations);

    return result[0]?.maxPeriod || null;
  } catch (error) {
    console.error("Error in getLatestPeriod:", error);
    return null;
  }
}