"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { eq, and, ilike, isNull, sql, asc } from "drizzle-orm";
import { getUser } from "@/lib/db/queries";
import { checkPermission } from "@/lib/auth/permissions";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/schemas/product.schemas";

// Return type for server actions
type ActionResult = {
  success?: string;
  error?: string;
};

// Helper function to check product code uniqueness
async function isProductCodeUnique(
  productCode: string,
  excludeId?: number
): Promise<boolean> {
  const trimmedCode = productCode.trim().toUpperCase();

  const conditions = [
    ilike(products.productCode, trimmedCode),
    isNull(products.deletedAt), // Only check active products
  ];

  // Exclude current record when updating
  if (excludeId) {
    conditions.push(sql`${products.id} != ${excludeId}`);
  }

  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return existingProduct.length === 0;
}

// Server Action: Create Product
export async function createProduct(
  values: CreateProductInput
): Promise<ActionResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền quản lý hàng hóa" };
    }

    // 2. Input Validation
    const validationResult = createProductSchema.safeParse(values);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return { error: firstError.message };
    }

    const validatedData = validationResult.data;

    // 3. Business Logic Validation - Check for duplicate product code (case-insensitive)
    const isUnique = await isProductCodeUnique(validatedData.productCode);
    if (!isUnique) {
      return { error: "Mã hàng đã tồn tại trong hệ thống" };
    }

    // 4. Database Operation
    const insertData = {
      productCode: validatedData.productCode.trim().toUpperCase(),
      name: validatedData.name.trim(),
      specification: validatedData.specification?.trim() || null,
      unit: validatedData.unit.trim(),
      category: validatedData.category.trim(),
      basePrice: validatedData.basePrice
        ? validatedData.basePrice.trim()
        : null,
      baseQuantity: validatedData.baseQuantity
        ? validatedData.baseQuantity.trim()
        : null,
      status: validatedData.status || "active",
    };

    await db.insert(products).values(insertData);

    // 5. Cache Revalidation
    revalidatePath("/danh-muc/hang-hoa");

    // 6. Return Success Response
    return { success: "Hàng hóa đã được tạo thành công" };
  } catch (error) {
    console.error("Error creating product:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return { error: "Mã hàng đã tồn tại trong hệ thống" };
      }
    }

    return { error: "Có lỗi xảy ra khi tạo hàng hóa. Vui lòng thử lại." };
  }
}

// Server Action: Update Product
export async function updateProduct(
  values: UpdateProductInput
): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền quản lý hàng hóa" };
    }

    // 2. Input Validation
    const validationResult = updateProductSchema.safeParse(values);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return { error: firstError.message };
    }

    const validatedData = validationResult.data;

    // 3. Check if product exists
    const existingProduct = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, validatedData.id), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct.length === 0) {
      return { error: "Không tìm thấy hàng hóa" };
    }

    // 4. Business Logic Validation - Check for duplicate product code (case-insensitive)
    const isUnique = await isProductCodeUnique(
      validatedData.productCode,
      validatedData.id
    );
    if (!isUnique) {
      return { error: "Mã hàng đã tồn tại trong hệ thống" };
    }

    // 5. Database Operation
    const updateData = {
      productCode: validatedData.productCode.trim().toUpperCase(),
      name: validatedData.name.trim(),
      specification: validatedData.specification?.trim() || null,
      unit: validatedData.unit.trim(),
      category: validatedData.category.trim(),
      basePrice: validatedData.basePrice
        ? validatedData.basePrice.trim()
        : null,
      baseQuantity: validatedData.baseQuantity
        ? validatedData.baseQuantity.trim()
        : null,
      status: validatedData.status,
      updatedAt: new Date(),
    };

    await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, validatedData.id));

    // 6. Cache Revalidation
    revalidatePath("/danh-muc/hang-hoa");

    // 7. Return Success Response
    return { success: "Hàng hóa đã được cập nhật thành công" };
  } catch (error) {
    console.error("Error updating product:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return { error: "Mã hàng đã tồn tại trong hệ thống" };
      }
    }

    return { error: "Có lỗi xảy ra khi cập nhật hàng hóa. Vui lòng thử lại." };
  }
}

// Server Action: Toggle Product Status
export async function toggleProductStatus(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền quản lý hàng hóa" };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: "ID hàng hóa không hợp lệ" };
    }

    // 3. Check if product exists and get current status
    const existingProduct = await db
      .select({ id: products.id, status: products.status, name: products.name })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct.length === 0) {
      return { error: "Không tìm thấy hàng hóa" };
    }

    const product = existingProduct[0];
    const newStatus = product.status === "active" ? "inactive" : "active";

    // 4. Database Operation
    await db
      .update(products)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // 5. Cache Revalidation
    revalidatePath("/danh-muc/hang-hoa");

    // 6. Return Success Response
    const statusText = newStatus === "active" ? "kích hoạt" : "tạm dừng";
    return {
      success: `Đã ${statusText} hàng hóa "${product.name}" thành công`,
    };
  } catch (error) {
    console.error("Error toggling product status:", error);
    return {
      error:
        "Có lỗi xảy ra khi thay đổi trạng thái hàng hóa. Vui lòng thử lại.",
    };
  }
}

// Server Action: Delete Product (Soft Delete)
export async function deleteProduct(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền thực hiện thao tác này" };
    }

    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền quản lý hàng hóa" };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: "ID hàng hóa không hợp lệ" };
    }

    // 3. Check if product exists
    const existingProduct = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct.length === 0) {
      return { error: "Không tìm thấy hàng hóa" };
    }

    const product = existingProduct[0];

    // 4. Database Operation (Soft Delete)
    await db
      .update(products)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // 5. Cache Revalidation
    revalidatePath("/danh-muc/hang-hoa");

    // 6. Return Success Response
    return { success: `Đã xóa hàng hóa "${product.name}" thành công` };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "Có lỗi xảy ra khi xóa hàng hóa. Vui lòng thử lại." };
  }
}

// Server Action: Get Product Categories
export async function getProductCategories(): Promise<
  string[] | { error: string }
> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền truy cập" };
    }

    // Check if user has permission to view products
    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền xem danh sách hàng hóa" };
    }

    // 2. Database Query - Get distinct categories
    const result = await db
      .selectDistinct({
        category: products.category,
      })
      .from(products)
      .where(
        and(
          isNull(products.deletedAt), // Exclude soft-deleted records
          sql`${products.category} IS NOT NULL AND TRIM(${products.category}) != ''` // Exclude null/empty categories
        )
      )
      .orderBy(asc(products.category));

    // 3. Extract and return category strings
    const categories = result
      .map((row) => row.category)
      .filter(
        (category): category is string =>
          category !== null && category.trim() !== ""
      );

    return categories;
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return { error: "Có lỗi xảy ra khi tải danh sách nhóm hàng" };
  }
}

// Server Action: Generate Product Import Template
export async function generateProductImportTemplate(): Promise<
  { success: true; base64: string } | { error: string }
> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền truy cập" };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền quản lý hàng hóa" };
    }

    // 2. Fetch distinct categories for dropdown validation
    const categoriesResult = await db
      .selectDistinct({
        category: products.category,
      })
      .from(products)
      .where(
        and(
          isNull(products.deletedAt),
          sql`${products.category} IS NOT NULL AND TRIM(${products.category}) != ''`
        )
      )
      .orderBy(asc(products.category));

    const categories = categoriesResult
      .map((row) => row.category)
      .filter(
        (category): category is string =>
          category !== null && category.trim() !== ""
      );

    // 3. Create Excel workbook using ExcelJS
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();

    // 4. Create very hidden validation data sheet (POLISH: veryHidden for better UX)
    const validationSheet = workbook.addWorksheet("data_validation");
    validationSheet.state = "veryHidden"; // veryHidden prevents users from unhiding in Excel

    // Populate categories in column A
    categories.forEach((category, index) => {
      validationSheet.getCell(`A${index + 1}`).value = category;
    });

    // Populate status values in column B (Vietnamese labels for UI)
    validationSheet.getCell("B1").value = "Hoạt động";
    validationSheet.getCell("B2").value = "Tạm dừng";

    // 5. Create main data sheet
    const mainSheet = workbook.addWorksheet("Danh sách Hàng hóa");

    // Define headers (Vietnamese for UI)
    const headers = [
      "Mã hàng",
      "Tên hàng hóa",
      "Quy cách",
      "Đơn vị tính",
      "Nhóm hàng",
      "Giá cơ sở",
      "Số lượng cơ sở",
      "Trạng thái",
    ];

    mainSheet.addRow(headers);

    // UPGRADE: Style header row cells individually (row 1 only)
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true };
    headers.forEach((_, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });

    // Set column widths
    mainSheet.columns = [
      { key: "productCode", width: 15 },
      { key: "name", width: 30 },
      { key: "specification", width: 25 },
      { key: "unit", width: 15 },
      { key: "category", width: 20 },
      { key: "basePrice", width: 15 },
      { key: "baseQuantity", width: 18 },
      { key: "status", width: 15 },
    ];

    // 6. UPGRADE: Apply data validation with Error Alert for "Nhóm hàng" column (column E, index 5)
    if (categories.length > 0) {
      const categoryValidation = {
        type: "list" as const,
        allowBlank: true,
        formulae: [`data_validation!$A$1:$A$${categories.length}`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Tạo Nhóm hàng Mới?",
        error:
          "Giá trị bạn nhập không có trong danh sách. Bạn có chắc muốn tạo một nhóm hàng mới không?",
      };

      // Apply validation to 1000 rows
      for (let row = 2; row <= 1001; row++) {
        mainSheet.getCell(`E${row}`).dataValidation = categoryValidation;
      }
    }

    // 7. BUGFIX: Apply strict data validation for "Trạng thái" column (column H, index 8)
    const statusValidation = {
      type: "list" as const,
      allowBlank: true,
      formulae: [`data_validation!$B$1:$B$2`],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Giá trị không hợp lệ",
      error: "Vui lòng chọn một giá trị từ danh sách: Hoạt động hoặc Tạm dừng",
    };

    for (let row = 2; row <= 1001; row++) {
      mainSheet.getCell(`H${row}`).dataValidation = statusValidation;
    }

    // 8. Generate buffer and convert to Base64
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return { success: true, base64 };
  } catch (error) {
    console.error("Error generating product import template:", error);
    return { error: "Có lỗi xảy ra khi tạo file mẫu. Vui lòng thử lại." };
  }
}

// Helper function to convert Vietnamese status labels to database values
function parseStatus(statusValue: string): "active" | "inactive" {
  const trimmed = statusValue.trim().toLowerCase();

  // Handle Vietnamese labels
  if (trimmed === "hoạt động") return "active";
  if (trimmed === "tạm dừng") return "inactive";

  // Handle English values (backward compatibility)
  if (trimmed === "active") return "active";
  if (trimmed === "inactive") return "inactive";

  // Default to active
  return "active";
}

// Server Action: Import Products from Excel
type ImportResult = {
  success?: string;
  created: number;
  updated: number;
  errors: string[];
};

export async function importProductsFromExcel(
  fileBuffer: ArrayBuffer
): Promise<ImportResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { created: 0, updated: 0, errors: ["Không có quyền truy cập"] };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return {
        created: 0,
        updated: 0,
        errors: ["Bạn không có quyền quản lý hàng hóa"],
      };
    }

    // 2. Parse Excel file using ExcelJS
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet("Danh sách Hàng hóa");
    if (!worksheet) {
      return {
        created: 0,
        updated: 0,
        errors: ['Không tìm thấy sheet "Danh sách Hàng hóa"'],
      };
    }

    // 3. Process rows with transaction
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    await db.transaction(async (tx) => {
      // Skip header row, start from row 2
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);

        // Get cell values
        const productCode = row.getCell(1).value?.toString().trim();
        const name = row.getCell(2).value?.toString().trim();
        const specification = row.getCell(3).value?.toString().trim() || null;
        const unit = row.getCell(4).value?.toString().trim();
        const category = row.getCell(5).value?.toString().trim();
        const basePrice = row.getCell(6).value?.toString().trim() || null;
        const baseQuantity = row.getCell(7).value?.toString().trim() || null;
        const statusRaw = row.getCell(8).value?.toString().trim() || "active";
        const status = parseStatus(statusRaw);

        // Skip empty rows
        if (!productCode && !name) continue;

        // Validate required field: productCode
        if (!productCode) {
          errors.push(`Dòng ${rowNumber}: Thiếu mã hàng`);
          continue;
        }

        try {
          // Check if product exists
          const existingProduct = await tx
            .select({ id: products.id })
            .from(products)
            .where(
              and(
                ilike(products.productCode, productCode.toUpperCase()),
                isNull(products.deletedAt)
              )
            )
            .limit(1);

          if (existingProduct.length > 0) {
            // UPDATE LOGIC: Build update object with non-empty values only
            const updateData: Record<string, any> = {
              updatedAt: new Date(),
            };

            if (name) updateData.name = name;
            if (specification !== undefined)
              updateData.specification = specification;
            if (unit) updateData.unit = unit;
            if (category) updateData.category = category;
            if (basePrice !== undefined) updateData.basePrice = basePrice;
            if (baseQuantity !== undefined)
              updateData.baseQuantity = baseQuantity;
            if (status) updateData.status = status;

            await tx
              .update(products)
              .set(updateData)
              .where(eq(products.id, existingProduct[0].id));

            updated++;
          } else {
            // CREATE LOGIC: Validate required fields
            if (!name) {
              errors.push(
                `Dòng ${rowNumber}: Thiếu tên hàng hóa (mã: ${productCode})`
              );
              continue;
            }
            if (!unit) {
              errors.push(
                `Dòng ${rowNumber}: Thiếu đơn vị tính (mã: ${productCode})`
              );
              continue;
            }
            if (!category) {
              errors.push(
                `Dòng ${rowNumber}: Thiếu nhóm hàng (mã: ${productCode})`
              );
              continue;
            }

            const insertData = {
              productCode: productCode.toUpperCase(),
              name,
              specification,
              unit,
              category,
              basePrice,
              baseQuantity,
              status,
            };

            await tx.insert(products).values(insertData);
            created++;
          }
        } catch (rowError) {
          console.error(`Error processing row ${rowNumber}:`, rowError);
          errors.push(
            `Dòng ${rowNumber}: ${
              rowError instanceof Error
                ? rowError.message
                : "Lỗi không xác định"
            }`
          );
        }
      }
    });

    // 4. Cache Revalidation
    revalidatePath("/danh-muc/hang-hoa");

    // 5. Return detailed result
    const successMessage = `Import hoàn tất: ${created} hàng hóa mới, ${updated} hàng hóa cập nhật`;
    return {
      success: successMessage,
      created,
      updated,
      errors,
    };
  } catch (error) {
    console.error("Error importing products from Excel:", error);
    return {
      created: 0,
      updated: 0,
      errors: ["Có lỗi xảy ra khi import file Excel. Vui lòng thử lại."],
    };
  }
}

// Server Action: Export Products to Excel
interface ExportFilters {
  search?: string;
  category?: string;
  status?: string;
}

export async function exportProductsToExcel(
  filters: ExportFilters = {}
): Promise<{ success: true; base64: string } | { error: string }> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: "Không có quyền truy cập" };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, "canManageProducts");
    if (!hasPermission) {
      return { error: "Bạn không có quyền xuất dữ liệu hàng hóa" };
    }

    // 2. Build query conditions based on filters
    const conditions = [isNull(products.deletedAt)];

    if (filters.search) {
      conditions.push(
        sql`(LOWER(${products.name}) LIKE LOWER(${"%" + filters.search + "%"}) OR LOWER(${products.productCode}) LIKE LOWER(${"%" + filters.search + "%"}))`
      );
    }

    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }

    if (filters.status && filters.status !== "all") {
      conditions.push(eq(products.status, filters.status));
    }

    // 3. Fetch products from database
    const productList = await db
      .select({
        productCode: products.productCode,
        name: products.name,
        specification: products.specification,
        unit: products.unit,
        category: products.category,
        basePrice: products.basePrice,
        baseQuantity: products.baseQuantity,
        status: products.status,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.createdAt));

    // 4. Create Excel workbook using ExcelJS
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();

    // 5. Fetch categories for validation sheet
    const categoriesResult = await db
      .selectDistinct({
        category: products.category,
      })
      .from(products)
      .where(
        and(
          isNull(products.deletedAt),
          sql`${products.category} IS NOT NULL AND TRIM(${products.category}) != ''`
        )
      )
      .orderBy(asc(products.category));

    const categories = categoriesResult
      .map((row) => row.category)
      .filter(
        (category): category is string => category !== null && category.trim() !== ""
      );

    // 6. Create very hidden validation data sheet (POLISH: veryHidden for better UX)
    const validationSheet = workbook.addWorksheet("data_validation");
    validationSheet.state = "veryHidden";

    // Populate categories in column A
    categories.forEach((category, index) => {
      validationSheet.getCell(`A${index + 1}`).value = category;
    });

    // Populate status values in column B
    validationSheet.getCell("B1").value = "Hoạt động";
    validationSheet.getCell("B2").value = "Tạm dừng";

    // 7. Create main data sheet with EXACT same structure as import template
    const mainSheet = workbook.addWorksheet("Danh sách Hàng hóa");

    // Define headers (Vietnamese for UI) - MUST match import template
    const headers = [
      "Mã hàng",
      "Tên hàng hóa",
      "Quy cách",
      "Đơn vị tính",
      "Nhóm hàng",
      "Giá cơ sở",
      "Số lượng cơ sở",
      "Trạng thái",
    ];

    mainSheet.addRow(headers);

    // Style header row cells individually (row 1 only)
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true };
    headers.forEach((_, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });

    // Set column widths - MUST match import template
    mainSheet.columns = [
      { key: "productCode", width: 15 },
      { key: "name", width: 30 },
      { key: "specification", width: 25 },
      { key: "unit", width: 15 },
      { key: "category", width: 20 },
      { key: "basePrice", width: 15 },
      { key: "baseQuantity", width: 18 },
      { key: "status", width: 15 },
    ];

    // 8. Populate data rows with proper number formatting
    productList.forEach((product, index) => {
      const rowNumber = index + 2; // Start from row 2 (after header)

      // Convert string numbers to actual numbers for Excel
      const basePriceNum = product.basePrice ? parseFloat(product.basePrice) : null;
      const baseQuantityNum = product.baseQuantity ? parseFloat(product.baseQuantity) : null;

      mainSheet.addRow([
        product.productCode,
        product.name,
        product.specification || "",
        product.unit,
        product.category,
        basePriceNum,
        baseQuantityNum,
        product.status === "active" ? "Hoạt động" : "Tạm dừng",
      ]);

      // Apply number format to price and quantity cells
      if (basePriceNum !== null) {
        mainSheet.getCell(`F${rowNumber}`).numFmt = '#,##0.00';
      }
      if (baseQuantityNum !== null) {
        mainSheet.getCell(`G${rowNumber}`).numFmt = '#,##0.00';
      }
    });

    // 9. Apply data validation for "Nhóm hàng" column (column E, index 5)
    if (categories.length > 0) {
      const categoryValidation = {
        type: "list" as const,
        allowBlank: true,
        formulae: [`data_validation!$A$1:$A$${categories.length}`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Tạo Nhóm hàng Mới?",
        error:
          "Giá trị bạn nhập không có trong danh sách. Bạn có chắc muốn tạo một nhóm hàng mới không?",
      };

      // Apply validation starting from row 2 to last data row + 1000 buffer
      const lastRow = productList.length + 1 + 1000;
      for (let row = 2; row <= lastRow; row++) {
        mainSheet.getCell(`E${row}`).dataValidation = categoryValidation;
      }
    }

    // 10. Apply data validation for "Trạng thái" column (column H, index 8)
    const statusValidation = {
      type: "list" as const,
      allowBlank: true,
      formulae: [`data_validation!$B$1:$B$2`],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Giá trị không hợp lệ",
      error:
        "Vui lòng chọn một giá trị từ danh sách: Hoạt động hoặc Tạm dừng",
    };

    const lastRow = productList.length + 1 + 1000;
    for (let row = 2; row <= lastRow; row++) {
      mainSheet.getCell(`H${row}`).dataValidation = statusValidation;
    }

    // 11. Generate buffer and convert to Base64
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return { success: true, base64 };
  } catch (error) {
    console.error("Error exporting products to Excel:", error);
    return { error: "Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại." };
  }
}
