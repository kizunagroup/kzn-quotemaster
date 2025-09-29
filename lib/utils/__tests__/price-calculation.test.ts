import { describe, it, expect } from '@jest/globals';
import {
  calculatePriceMetrics,
  findBestPrice,
  calculateComparisonMatrix,
  calculatePriceListMatrix,
  formatCurrency,
  formatPercentage,
  calculateSavings,
  calculateTotalCost,
  type PriceItem,
  type ComparisonMetrics
} from '../price-calculation';

describe('Price Calculation Utilities', () => {
  describe('calculatePriceMetrics', () => {
    it('should calculate metrics for approved price', () => {
      const priceItem: PriceItem = {
        id: 1,
        productId: 1,
        productCode: 'SP001',
        productName: 'Product A',
        supplierId: 1,
        supplierCode: 'NCC001',
        supplierName: 'Supplier A',
        initialPrice: 100,
        negotiatedPrice: 90,
        approvedPrice: 85,
        vatRate: 10,
        currency: 'VND',
        unit: 'kg'
      };

      const metrics = calculatePriceMetrics(priceItem, 5);

      expect(metrics.pricePerUnit).toBe(85); // Uses approved price
      expect(metrics.totalPrice).toBe(425); // 85 * 5
      expect(metrics.vatAmount).toBe(42.5); // 425 * 0.1
      expect(metrics.totalPriceWithVAT).toBe(467.5); // 425 + 42.5
      expect(metrics.hasPrice).toBe(true);
    });

    it('should fallback to negotiated price when approved is not available', () => {
      const priceItem: PriceItem = {
        id: 1,
        productId: 1,
        productCode: 'SP001',
        productName: 'Product A',
        supplierId: 1,
        supplierCode: 'NCC001',
        supplierName: 'Supplier A',
        initialPrice: 100,
        negotiatedPrice: 90,
        vatRate: 10,
        currency: 'VND',
        unit: 'kg'
      };

      const metrics = calculatePriceMetrics(priceItem, 5);

      expect(metrics.pricePerUnit).toBe(90); // Uses negotiated price
      expect(metrics.totalPrice).toBe(450); // 90 * 5
    });

    it('should fallback to initial price when others are not available', () => {
      const priceItem: PriceItem = {
        id: 1,
        productId: 1,
        productCode: 'SP001',
        productName: 'Product A',
        supplierId: 1,
        supplierCode: 'NCC001',
        supplierName: 'Supplier A',
        initialPrice: 100,
        vatRate: 10,
        currency: 'VND',
        unit: 'kg'
      };

      const metrics = calculatePriceMetrics(priceItem, 5);

      expect(metrics.pricePerUnit).toBe(100); // Uses initial price
      expect(metrics.totalPrice).toBe(500); // 100 * 5
    });

    it('should handle items without any price', () => {
      const priceItem: PriceItem = {
        id: 1,
        productId: 1,
        productCode: 'SP001',
        productName: 'Product A',
        supplierId: 1,
        supplierCode: 'NCC001',
        supplierName: 'Supplier A',
        vatRate: 10,
        currency: 'VND',
        unit: 'kg'
      };

      const metrics = calculatePriceMetrics(priceItem, 5);

      expect(metrics.hasPrice).toBe(false);
      expect(metrics.totalPriceWithVAT).toBe(0);
    });
  });

  describe('findBestPrice', () => {
    it('should find the supplier with lowest total price with VAT', () => {
      const suppliers: Record<number, PriceItem & ComparisonMetrics> = {
        1: {
          id: 1,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 1,
          supplierCode: 'NCC001',
          supplierName: 'Supplier A',
          approvedPrice: 100,
          vatRate: 10,
          currency: 'VND',
          unit: 'kg',
          pricePerUnit: 100,
          totalPrice: 500,
          vatAmount: 50,
          totalPriceWithVAT: 550,
          hasPrice: true,
          hasBestPrice: false
        },
        2: {
          id: 2,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 2,
          supplierCode: 'NCC002',
          supplierName: 'Supplier B',
          approvedPrice: 95,
          vatRate: 5,
          currency: 'VND',
          unit: 'kg',
          pricePerUnit: 95,
          totalPrice: 475,
          vatAmount: 23.75,
          totalPriceWithVAT: 498.75,
          hasPrice: true,
          hasBestPrice: false
        }
      };

      const result = findBestPrice(suppliers);

      expect(result.bestSupplierId).toBe(2);
      expect(result.bestPrice).toBe(498.75);
    });

    it('should return undefined when no suppliers have prices', () => {
      const suppliers: Record<number, PriceItem & ComparisonMetrics> = {
        1: {
          id: 1,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 1,
          supplierCode: 'NCC001',
          supplierName: 'Supplier A',
          vatRate: 10,
          currency: 'VND',
          unit: 'kg',
          pricePerUnit: 0,
          totalPrice: 0,
          vatAmount: 0,
          totalPriceWithVAT: 0,
          hasPrice: false,
          hasBestPrice: false
        }
      };

      const result = findBestPrice(suppliers);

      expect(result.bestSupplierId).toBeUndefined();
      expect(result.bestPrice).toBeUndefined();
    });
  });

  describe('calculateComparisonMatrix', () => {
    it('should calculate comparison matrix with two-tier quantity logic', () => {
      const priceItems: PriceItem[] = [
        {
          id: 1,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 1,
          supplierCode: 'NCC001',
          supplierName: 'Supplier A',
          approvedPrice: 100,
          vatRate: 10,
          currency: 'VND',
          unit: 'kg'
        },
        {
          id: 2,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 2,
          supplierCode: 'NCC002',
          supplierName: 'Supplier B',
          approvedPrice: 95,
          vatRate: 5,
          currency: 'VND',
          unit: 'kg'
        }
      ];

      const kitchenDemands = [
        { productId: 1, quantity: 10 }
      ];

      const productBaseQuantities = [
        { productId: 1, baseQuantity: 5 }
      ];

      const matrix = calculateComparisonMatrix(
        priceItems,
        kitchenDemands,
        productBaseQuantities,
        '2024-01-01',
        'Hà Nội'
      );

      expect(matrix.products).toHaveLength(1);
      expect(matrix.products[0].quantity).toBe(10); // Uses kitchen demand
      expect(matrix.products[0].quantitySource).toBe('kitchen_demand');
      expect(matrix.suppliers).toHaveLength(2);
      expect(matrix.period).toBe('2024-01-01');
      expect(matrix.region).toBe('Hà Nội');
    });

    it('should fallback to base quantity when kitchen demand is not available', () => {
      const priceItems: PriceItem[] = [
        {
          id: 1,
          productId: 1,
          productCode: 'SP001',
          productName: 'Product A',
          supplierId: 1,
          supplierCode: 'NCC001',
          supplierName: 'Supplier A',
          approvedPrice: 100,
          vatRate: 10,
          currency: 'VND',
          unit: 'kg'
        }
      ];

      const kitchenDemands: any[] = []; // No kitchen demands

      const productBaseQuantities = [
        { productId: 1, baseQuantity: 5 }
      ];

      const matrix = calculateComparisonMatrix(
        priceItems,
        kitchenDemands,
        productBaseQuantities,
        '2024-01-01',
        'Hà Nội'
      );

      expect(matrix.products).toHaveLength(1);
      expect(matrix.products[0].quantity).toBe(5); // Uses base quantity
      expect(matrix.products[0].quantitySource).toBe('base_quantity');
    });
  });

  describe('formatCurrency', () => {
    it('should format VND currency correctly', () => {
      const formatted = formatCurrency(1000000, 'VND', 'vi-VN');
      expect(formatted).toContain('1.000.000');
    });

    it('should use default VND currency', () => {
      const formatted = formatCurrency(50000);
      expect(formatted).toContain('50.000');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default 1 decimal', () => {
      const formatted = formatPercentage(15.666);
      expect(formatted).toBe('15.7%');
    });

    it('should format percentage with custom decimals', () => {
      const formatted = formatPercentage(15.666, 2);
      expect(formatted).toBe('15.67%');
    });
  });

  describe('calculateSavings', () => {
    it('should calculate savings correctly', () => {
      const savings = calculateSavings(80, 100);

      expect(savings.savingsAmount).toBe(20);
      expect(savings.savingsPercentage).toBe(20);
    });

    it('should handle negative savings (price increase)', () => {
      const savings = calculateSavings(120, 100);

      expect(savings.savingsAmount).toBe(-20);
      expect(savings.savingsPercentage).toBe(-20);
    });

    it('should handle zero baseline price', () => {
      const savings = calculateSavings(50, 0);

      expect(savings.savingsAmount).toBe(-50);
      expect(savings.savingsPercentage).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost with VAT for multiple items', () => {
      const items = [
        { price: 100, quantity: 2, vatRate: 10 },
        { price: 50, quantity: 3, vatRate: 5 }
      ];

      const total = calculateTotalCost(items);

      expect(total.subtotal).toBe(350); // (100*2) + (50*3)
      expect(total.totalVAT).toBe(27.5); // (200*0.1) + (150*0.05)
      expect(total.total).toBe(377.5); // 350 + 27.5
    });

    it('should handle zero VAT rates', () => {
      const items = [
        { price: 100, quantity: 1, vatRate: 0 }
      ];

      const total = calculateTotalCost(items);

      expect(total.subtotal).toBe(100);
      expect(total.totalVAT).toBe(0);
      expect(total.total).toBe(100);
    });
  });
});