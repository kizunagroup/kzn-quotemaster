'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { products } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql, asc } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';
import { checkPermission } from '@/lib/auth/permissions';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/lib/schemas/product.schemas';

// Return type for server actions
type ActionResult = {
  success?: string;
  error?: string;
};

// Helper function to check product code uniqueness
async function isProductCodeUnique(productCode: string, excludeId?: number): Promise<boolean> {
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
export async function createProduct(values: CreateProductInput): Promise<ActionResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý hàng hóa' };
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
      return { error: 'Mã hàng đã tồn tại trong hệ thống' };
    }

    // 4. Database Operation
    const insertData = {
      productCode: validatedData.productCode.trim().toUpperCase(),
      name: validatedData.name.trim(),
      specification: validatedData.specification?.trim() || null,
      unit: validatedData.unit.trim(),
      category: validatedData.category.trim(),
      basePrice: validatedData.basePrice ? validatedData.basePrice.trim() : null,
      baseQuantity: validatedData.baseQuantity ? validatedData.baseQuantity.trim() : null,
      status: validatedData.status || 'active',
    };

    await db.insert(products).values(insertData);

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/hang-hoa');

    // 6. Return Success Response
    return { success: 'Hàng hóa đã được tạo thành công' };
  } catch (error) {
    console.error('Error creating product:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return { error: 'Mã hàng đã tồn tại trong hệ thống' };
      }
    }

    return { error: 'Có lỗi xảy ra khi tạo hàng hóa. Vui lòng thử lại.' };
  }
}

// Server Action: Update Product
export async function updateProduct(values: UpdateProductInput): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý hàng hóa' };
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
      return { error: 'Không tìm thấy hàng hóa' };
    }

    // 4. Business Logic Validation - Check for duplicate product code (case-insensitive)
    const isUnique = await isProductCodeUnique(validatedData.productCode, validatedData.id);
    if (!isUnique) {
      return { error: 'Mã hàng đã tồn tại trong hệ thống' };
    }

    // 5. Database Operation
    const updateData = {
      productCode: validatedData.productCode.trim().toUpperCase(),
      name: validatedData.name.trim(),
      specification: validatedData.specification?.trim() || null,
      unit: validatedData.unit.trim(),
      category: validatedData.category.trim(),
      basePrice: validatedData.basePrice ? validatedData.basePrice.trim() : null,
      baseQuantity: validatedData.baseQuantity ? validatedData.baseQuantity.trim() : null,
      status: validatedData.status,
      updatedAt: new Date(),
    };

    await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, validatedData.id));

    // 6. Cache Revalidation
    revalidatePath('/danh-muc/hang-hoa');

    // 7. Return Success Response
    return { success: 'Hàng hóa đã được cập nhật thành công' };
  } catch (error) {
    console.error('Error updating product:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        return { error: 'Mã hàng đã tồn tại trong hệ thống' };
      }
    }

    return { error: 'Có lỗi xảy ra khi cập nhật hàng hóa. Vui lòng thử lại.' };
  }
}

// Server Action: Toggle Product Status
export async function toggleProductStatus(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý hàng hóa' };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: 'ID hàng hóa không hợp lệ' };
    }

    // 3. Check if product exists and get current status
    const existingProduct = await db
      .select({ id: products.id, status: products.status, name: products.name })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct.length === 0) {
      return { error: 'Không tìm thấy hàng hóa' };
    }

    const product = existingProduct[0];
    const newStatus = product.status === 'active' ? 'inactive' : 'active';

    // 4. Database Operation
    await db
      .update(products)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));

    // 5. Cache Revalidation
    revalidatePath('/danh-muc/hang-hoa');

    // 6. Return Success Response
    const statusText = newStatus === 'active' ? 'kích hoạt' : 'tạm dừng';
    return { success: `Đã ${statusText} hàng hóa "${product.name}" thành công` };
  } catch (error) {
    console.error('Error toggling product status:', error);
    return { error: 'Có lỗi xảy ra khi thay đổi trạng thái hàng hóa. Vui lòng thử lại.' };
  }
}

// Server Action: Delete Product (Soft Delete)
export async function deleteProduct(id: number): Promise<ActionResult> {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền thực hiện thao tác này' };
    }

    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý hàng hóa' };
    }

    // 2. Validation
    if (!id || id <= 0) {
      return { error: 'ID hàng hóa không hợp lệ' };
    }

    // 3. Check if product exists
    const existingProduct = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct.length === 0) {
      return { error: 'Không tìm thấy hàng hóa' };
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
    revalidatePath('/danh-muc/hang-hoa');

    // 6. Return Success Response
    return { success: `Đã xóa hàng hóa "${product.name}" thành công` };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error: 'Có lỗi xảy ra khi xóa hàng hóa. Vui lòng thử lại.' };
  }
}

// Server Action: Get Product Categories
export async function getProductCategories(): Promise<string[] | { error: string }> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { error: 'Không có quyền truy cập' };
    }

    // Check if user has permission to view products
    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền xem danh sách hàng hóa' };
    }

    // 2. Database Query - Get distinct categories
    const result = await db
      .selectDistinct({
        category: products.category
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
      .map(row => row.category)
      .filter((category): category is string =>
        category !== null && category.trim() !== ''
      );

    return categories;
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return { error: 'Có lỗi xảy ra khi tải danh sách nhóm hàng' };
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
      return { error: 'Không có quyền truy cập' };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { error: 'Bạn không có quyền quản lý hàng hóa' };
    }

    // 2. Fetch distinct categories for dropdown validation
    const categoriesResult = await db
      .selectDistinct({
        category: products.category
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
      .map(row => row.category)
      .filter((category): category is string =>
        category !== null && category.trim() !== ''
      );

    // 3. Create Excel workbook using ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();

    // 4. Create hidden validation data sheet
    const validationSheet = workbook.addWorksheet('data_validation', {
      state: 'hidden'
    });

    // Populate categories in column A
    categories.forEach((category, index) => {
      validationSheet.getCell(`A${index + 1}`).value = category;
    });

    // 5. Create main data sheet
    const mainSheet = workbook.addWorksheet('Danh sách Hàng hóa');

    // Define headers (Vietnamese for UI)
    const headers = [
      'Mã hàng',
      'Tên hàng hóa',
      'Quy cách',
      'Đơn vị tính',
      'Nhóm hàng',
      'Giá cơ sở',
      'Số lượng cơ sở',
      'Trạng thái'
    ];

    mainSheet.addRow(headers);

    // Style header row
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set column widths
    mainSheet.columns = [
      { key: 'productCode', width: 15 },
      { key: 'name', width: 30 },
      { key: 'specification', width: 25 },
      { key: 'unit', width: 15 },
      { key: 'category', width: 20 },
      { key: 'basePrice', width: 15 },
      { key: 'baseQuantity', width: 18 },
      { key: 'status', width: 15 }
    ];

    // 6. Apply data validation for "Nhóm hàng" column (column E, index 5)
    if (categories.length > 0) {
      const categoryValidation = {
        type: 'list' as const,
        allowBlank: true,
        formulae: [`data_validation!$A$1:$A$${categories.length}`]
      };

      // Apply validation to 1000 rows
      for (let row = 2; row <= 1001; row++) {
        mainSheet.getCell(`E${row}`).dataValidation = categoryValidation;
      }
    }

    // 7. Apply data validation for "Trạng thái" column (column H, index 8)
    const statusValidation = {
      type: 'list' as const,
      allowBlank: true,
      formulae: ['"active,inactive"']
    };

    for (let row = 2; row <= 1001; row++) {
      mainSheet.getCell(`H${row}`).dataValidation = statusValidation;
    }

    // 8. Generate buffer and convert to Base64
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { success: true, base64 };
  } catch (error) {
    console.error('Error generating product import template:', error);
    return { error: 'Có lỗi xảy ra khi tạo file mẫu. Vui lòng thử lại.' };
  }
}

// Server Action: Import Products from Excel
type ImportResult = {
  success?: string;
  created: number;
  updated: number;
  errors: string[];
};

export async function importProductsFromExcel(fileBuffer: ArrayBuffer): Promise<ImportResult> {
  try {
    // 1. Authorization Check (CRITICAL FIRST STEP)
    const user = await getUser();
    if (!user) {
      return { created: 0, updated: 0, errors: ['Không có quyền truy cập'] };
    }

    // Check if user has permission to manage products
    const hasPermission = await checkPermission(user.id, 'canManageProducts');
    if (!hasPermission) {
      return { created: 0, updated: 0, errors: ['Bạn không có quyền quản lý hàng hóa'] };
    }

    // 2. Parse Excel file using ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet('Danh sách Hàng hóa');
    if (!worksheet) {
      return { created: 0, updated: 0, errors: ['Không tìm thấy sheet "Danh sách Hàng hóa"'] };
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
        const status = row.getCell(8).value?.toString().trim() || 'active';

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
              updatedAt: new Date()
            };

            if (name) updateData.name = name;
            if (specification !== undefined) updateData.specification = specification;
            if (unit) updateData.unit = unit;
            if (category) updateData.category = category;
            if (basePrice !== undefined) updateData.basePrice = basePrice;
            if (baseQuantity !== undefined) updateData.baseQuantity = baseQuantity;
            if (status) updateData.status = status;

            await tx
              .update(products)
              .set(updateData)
              .where(eq(products.id, existingProduct[0].id));

            updated++;
          } else {
            // CREATE LOGIC: Validate required fields
            if (!name) {
              errors.push(`Dòng ${rowNumber}: Thiếu tên hàng hóa (mã: ${productCode})`);
              continue;
            }
            if (!unit) {
              errors.push(`Dòng ${rowNumber}: Thiếu đơn vị tính (mã: ${productCode})`);
              continue;
            }
            if (!category) {
              errors.push(`Dòng ${rowNumber}: Thiếu nhóm hàng (mã: ${productCode})`);
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
              status: status as 'active' | 'inactive'
            };

            await tx.insert(products).values(insertData);
            created++;
          }
        } catch (rowError) {
          console.error(`Error processing row ${rowNumber}:`, rowError);
          errors.push(`Dòng ${rowNumber}: ${rowError instanceof Error ? rowError.message : 'Lỗi không xác định'}`);
        }
      }
    });

    // 4. Cache Revalidation
    revalidatePath('/danh-muc/hang-hoa');

    // 5. Return detailed result
    const successMessage = `Import hoàn tất: ${created} hàng hóa mới, ${updated} hàng hóa cập nhật`;
    return {
      success: successMessage,
      created,
      updated,
      errors
    };
  } catch (error) {
    console.error('Error importing products from Excel:', error);
    return {
      created: 0,
      updated: 0,
      errors: ['Có lỗi xảy ra khi import file Excel. Vui lòng thử lại.']
    };
  }
}