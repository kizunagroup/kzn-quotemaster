'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import useSWR from 'swr';

/**
 * Price Trends Component for Dashboard
 *
 * Displays two sections:
 * - Top 10 products with price increases
 * - Top 10 products with price decreases
 *
 * Fetches real data from the price trends API endpoint
 */

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

export interface PriceTrendsResponse {
  priceIncreases: ProductTrend[];
  priceDecreases: ProductTrend[];
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

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
      <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-red-100 mb-4">
        <TrendingUp className="h-8 w-8 text-red-400" />
      </div>
      <p className="text-sm text-red-600 mb-1">Lỗi tải dữ liệu</p>
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}

export function PriceTrends() {
  const { data, error, isLoading } = useSWR<PriceTrendsResponse>('/api/dashboard/price-trends', fetcher);

  const priceIncreases = data?.priceIncreases || [];
  const priceDecreases = data?.priceDecreases || [];
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
            Danh sách top 10 sản phẩm có giá biến động tăng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message="Không thể tải dữ liệu biến động giá" />
          ) : priceIncreases.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Chưa có dữ liệu biến động tăng"
            />
          ) : (
            <div className="space-y-2">
              {priceIncreases.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.productCode}</p>
                    <p className="text-xs text-gray-400">{product.supplier}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-red-600">
                      +{product.priceChangePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {product.previousPrice.toLocaleString('vi-VN')} → {product.currentPrice.toLocaleString('vi-VN')}
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
            Danh sách top 10 sản phẩm có giá biến động giảm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message="Không thể tải dữ liệu biến động giá" />
          ) : priceDecreases.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title="Chưa có dữ liệu biến động giảm"
            />
          ) : (
            <div className="space-y-2">
              {priceDecreases.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.productCode}</p>
                    <p className="text-xs text-gray-400">{product.supplier}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-green-600">
                      {product.priceChangePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {product.previousPrice.toLocaleString('vi-VN')} → {product.currentPrice.toLocaleString('vi-VN')}
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
