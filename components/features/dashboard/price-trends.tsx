'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

/**
 * Price Trends Component for Dashboard
 *
 * Displays two sections:
 * - Top 20 products with price increases
 * - Top 20 products with price decreases
 *
 * MVP Implementation: Shows placeholder message
 * Future: Will display actual price trend data from API
 */

export interface ProductTrend {
  productId: number;
  productCode: string;
  productName: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  priceChangePercentage: number;
  supplier: string;
  period: string;
}

export interface PriceTrendsProps {
  priceIncreases?: ProductTrend[];
  priceDecreases?: ProductTrend[];
}

function EmptyState({ icon: Icon, title }: { icon: typeof TrendingUp; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-xs text-gray-400">Dữ liệu đang được cập nhật...</p>
    </div>
  );
}

export function PriceTrends({ priceIncreases = [], priceDecreases = [] }: PriceTrendsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Price Increases Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base">
                Biến động giá tăng
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            Danh sách top 20 sản phẩm có giá biến động tăng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceIncreases.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Chưa có dữ liệu biến động tăng"
            />
          ) : (
            <div className="space-y-2">
              {/* Future: Render list of products with price increases */}
              {priceIncreases.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.productCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">
                      +{product.priceChangePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.currentPrice.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Decreases Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">
                Biến động giá giảm
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            Danh sách top 20 sản phẩm có giá biến động giảm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceDecreases.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="Chưa có dữ liệu biến động giảm"
            />
          ) : (
            <div className="space-y-2">
              {/* Future: Render list of products with price decreases */}
              {priceDecreases.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.productCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      {product.priceChangePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.currentPrice.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
