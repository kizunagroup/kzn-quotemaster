'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { products } from '@/lib/db/schema';
import { eq, and, ilike, isNull, sql } from 'drizzle-orm';
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