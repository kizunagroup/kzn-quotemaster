import { z } from 'zod';

// Type definitions for price calculations
export interface PriceItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  initialPrice?: number;
  negotiatedPrice?: number;
  approvedPrice?: number;
  vatRate: number;
  currency: string;
  quantity?: number; // From kitchen_period_demands or products.base_quantity
  unit: string;
}

export interface ComparisonMetrics {
  pricePerUnit: number;
  totalPrice: number;
  vatAmount: number;
  totalPriceWithVAT: number;
  hasBestPrice: boolean;
  hasPrice: boolean;
}

export interface ProductComparison {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  quantitySource: 'kitchen_demand' | 'base_quantity';
  baseQuantity: number;
  suppliers: Record<number, PriceItem & ComparisonMetrics>;
  bestSupplierId?: number;
  bestPrice?: number;
  previousApprovedPrice?: number;
}

export interface ComparisonMatrix {
  products: ProductComparison[];
  suppliers: Array<{
    id: number;
    code: string;
    name: string;
    totalProducts: number;
    quotedProducts: number;
    coveragePercentage: number;
  }>;
  period: string;
  region: string;
  category?: string;
}

/**
 * Calculate price metrics for a single price item
 */
export function calculatePriceMetrics(
  item: PriceItem,
  quantity: number = 1
): ComparisonMetrics {
  // Determine which price to use (priority: approved > negotiated > initial)
  const effectivePrice = item.approvedPrice ?? item.negotiatedPrice ?? item.initialPrice;
  const hasPrice = effectivePrice !== undefined && effectivePrice !== null;

  if (!hasPrice) {
    return {
      pricePerUnit: 0,
      totalPrice: 0,
      vatAmount: 0,
      totalPriceWithVAT: 0,
      hasBestPrice: false,
      hasPrice: false
    };
  }

  const pricePerUnit = effectivePrice!;
  const totalPrice = pricePerUnit * quantity;
  const vatAmount = totalPrice * (item.vatRate / 100);
  const totalPriceWithVAT = totalPrice + vatAmount;

  return {
    pricePerUnit,
    totalPrice,
    vatAmount,
    totalPriceWithVAT,
    hasBestPrice: false, // Will be set by comparison functions
    hasPrice: true
  };
}

/**
 * Find the best price among suppliers for a single product
 */
export function findBestPrice(
  suppliers: Record<number, PriceItem & ComparisonMetrics>
): { bestSupplierId?: number; bestPrice?: number } {
  let bestSupplierId: number | undefined;
  let bestPrice: number | undefined;

  for (const [supplierIdStr, supplier] of Object.entries(suppliers)) {
    const supplierId = parseInt(supplierIdStr);

    if (supplier.hasPrice && supplier.totalPriceWithVAT > 0) {
      if (bestPrice === undefined || supplier.totalPriceWithVAT < bestPrice) {
        bestPrice = supplier.totalPriceWithVAT;
        bestSupplierId = supplierId;
      }
    }
  }

  return { bestSupplierId, bestPrice };
}

/**
 * Calculate comparison metrics for multiple products and suppliers
 * Implements the two-tier quantity logic: kitchen_period_demands → products.base_quantity
 */
export function calculateComparisonMatrix(
  priceItems: PriceItem[],
  kitchenDemands: Array<{
    productId: number;
    quantity: number;
  }>,
  productBaseQuantities: Array<{
    productId: number;
    baseQuantity: number;
  }>,
  period: string,
  region: string,
  category?: string
): ComparisonMatrix {
  // Create quantity lookup with two-tier logic
  const quantityLookup = new Map<number, { quantity: number; source: 'kitchen_demand' | 'base_quantity' }>();

  // First priority: kitchen demands
  kitchenDemands.forEach(demand => {
    quantityLookup.set(demand.productId, {
      quantity: demand.quantity,
      source: 'kitchen_demand'
    });
  });

  // Second priority: base quantities (only for products without kitchen demands)
  productBaseQuantities.forEach(product => {
    if (!quantityLookup.has(product.productId)) {
      quantityLookup.set(product.productId, {
        quantity: product.baseQuantity,
        source: 'base_quantity'
      });
    }
  });

  // Group price items by product
  const productGroups = new Map<number, PriceItem[]>();
  priceItems.forEach(item => {
    if (!productGroups.has(item.productId)) {
      productGroups.set(item.productId, []);
    }
    productGroups.get(item.productId)!.push(item);
  });

  // Get unique suppliers
  const suppliersMap = new Map<number, { id: number; code: string; name: string }>();
  priceItems.forEach(item => {
    suppliersMap.set(item.supplierId, {
      id: item.supplierId,
      code: item.supplierCode,
      name: item.supplierName
    });
  });

  // Calculate comparison for each product
  const products: ProductComparison[] = [];

  for (const [productId, items] of productGroups.entries()) {
    const firstItem = items[0];
    const quantityInfo = quantityLookup.get(productId);

    if (!quantityInfo) {
      // Skip products without quantity information
      continue;
    }

    const suppliers: Record<number, PriceItem & ComparisonMetrics> = {};

    // Calculate metrics for each supplier
    items.forEach(item => {
      const metrics = calculatePriceMetrics(item, quantityInfo.quantity);
      suppliers[item.supplierId] = {
        ...item,
        ...metrics
      };
    });

    // Find best price
    const { bestSupplierId, bestPrice } = findBestPrice(suppliers);

    // Mark best price supplier
    if (bestSupplierId !== undefined) {
      suppliers[bestSupplierId].hasBestPrice = true;
    }

    products.push({
      productId,
      productCode: firstItem.productCode,
      productName: firstItem.productName,
      unit: firstItem.unit,
      quantity: quantityInfo.quantity,
      quantitySource: quantityInfo.source,
      suppliers,
      bestSupplierId,
      bestPrice
    });
  }

  // Calculate supplier statistics
  const suppliers = Array.from(suppliersMap.values()).map(supplier => {
    const totalProducts = products.length;
    const quotedProducts = products.filter(product =>
      supplier.id in product.suppliers && product.suppliers[supplier.id].hasPrice
    ).length;
    const coveragePercentage = totalProducts > 0 ? (quotedProducts / totalProducts) * 100 : 0;

    return {
      ...supplier,
      totalProducts,
      quotedProducts,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100 // Round to 2 decimal places
    };
  });

  return {
    products,
    suppliers,
    period,
    region,
    category
  };
}

/**
 * Calculate price list matrix for a specific team (kitchen)
 * Only shows approved prices from suppliers that can serve this team
 */
export function calculatePriceListMatrix(
  approvedPriceItems: PriceItem[],
  teamId: number,
  period: string
): {
  products: Array<{
    productId: number;
    productCode: string;
    productName: string;
    unit: string;
    suppliers: Record<number, {
      supplierId: number;
      supplierCode: string;
      supplierName: string;
      approvedPrice: number;
      vatRate: number;
      totalPriceWithVAT: number;
      hasBestPrice: boolean;
    }>;
    bestSupplierId?: number;
    bestPrice?: number;
  }>;
  suppliers: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  teamId: number;
  period: string;
} {
  // Group by product
  const productGroups = new Map<number, PriceItem[]>();
  approvedPriceItems.forEach(item => {
    if (!productGroups.has(item.productId)) {
      productGroups.set(item.productId, []);
    }
    productGroups.get(item.productId)!.push(item);
  });

  // Get unique suppliers
  const suppliersMap = new Map<number, { id: number; code: string; name: string }>();
  approvedPriceItems.forEach(item => {
    suppliersMap.set(item.supplierId, {
      id: item.supplierId,
      code: item.supplierCode,
      name: item.supplierName
    });
  });

  const products = [];

  for (const [productId, items] of productGroups.entries()) {
    const firstItem = items[0];
    const suppliers: Record<number, any> = {};

    // Process each supplier for this product
    items.forEach(item => {
      if (item.approvedPrice !== undefined && item.approvedPrice !== null) {
        const totalPriceWithVAT = item.approvedPrice * (1 + item.vatRate / 100);

        suppliers[item.supplierId] = {
          supplierId: item.supplierId,
          supplierCode: item.supplierCode,
          supplierName: item.supplierName,
          approvedPrice: item.approvedPrice,
          vatRate: item.vatRate,
          totalPriceWithVAT,
          hasBestPrice: false
        };
      }
    });

    // Find best price
    let bestSupplierId: number | undefined;
    let bestPrice: number | undefined;

    for (const [supplierIdStr, supplier] of Object.entries(suppliers)) {
      const supplierId = parseInt(supplierIdStr);

      if (bestPrice === undefined || supplier.totalPriceWithVAT < bestPrice) {
        bestPrice = supplier.totalPriceWithVAT;
        bestSupplierId = supplierId;
      }
    }

    // Mark best price
    if (bestSupplierId !== undefined) {
      suppliers[bestSupplierId].hasBestPrice = true;
    }

    products.push({
      productId,
      productCode: firstItem.productCode,
      productName: firstItem.productName,
      unit: firstItem.unit,
      suppliers,
      bestSupplierId,
      bestPrice
    });
  }

  return {
    products,
    suppliers: Array.from(suppliersMap.values()),
    teamId,
    period
  };
}

/**
 * Format currency values for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'VND',
  locale: string = 'vi-VN'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage values for display
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Validate price data structure
 */
export const PriceItemSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  supplierId: z.number(),
  supplierCode: z.string(),
  supplierName: z.string(),
  initialPrice: z.number().nonnegative().optional(),
  negotiatedPrice: z.number().nonnegative().optional(),
  approvedPrice: z.number().nonnegative().optional(),
  vatRate: z.number().min(0).max(100),
  currency: z.string(),
  quantity: z.number().positive().optional(),
  unit: z.string()
});

/**
 * Calculate savings compared to a baseline price
 */
export function calculateSavings(
  currentPrice: number,
  baselinePrice: number
): {
  savingsAmount: number;
  savingsPercentage: number;
} {
  const savingsAmount = baselinePrice - currentPrice;
  const savingsPercentage = baselinePrice > 0 ? (savingsAmount / baselinePrice) * 100 : 0;

  return {
    savingsAmount,
    savingsPercentage
  };
}

/**
 * Calculate total cost for multiple items
 */
export function calculateTotalCost(
  items: Array<{
    price: number;
    quantity: number;
    vatRate: number;
  }>
): {
  subtotal: number;
  totalVAT: number;
  total: number;
} {
  let subtotal = 0;
  let totalVAT = 0;

  items.forEach(item => {
    const itemSubtotal = item.price * item.quantity;
    const itemVAT = itemSubtotal * (item.vatRate / 100);

    subtotal += itemSubtotal;
    totalVAT += itemVAT;
  });

  return {
    subtotal,
    totalVAT,
    total: subtotal + totalVAT
  };
}