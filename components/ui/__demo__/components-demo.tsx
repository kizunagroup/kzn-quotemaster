"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegionAutocomplete } from '../region-autocomplete';
import { PriceBadge, BestPriceBadge, RegularPriceBadge, PriceComparison } from '../price-badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

/**
 * Demo component to showcase the reusable UI components
 * This can be used during development to test components visually
 */
export function ComponentsDemo() {
  const [selectedRegion, setSelectedRegion] = React.useState<string>('');
  const [demoPrice, setDemoPrice] = React.useState(1250000);

  const samplePrices = [
    { label: 'NCC Việt Nam', price: 1250000, isBest: true },
    { label: 'NCC Đông Á', price: 1350000, isBest: false },
    { label: 'NCC Thành Phố', price: 1180000, isBest: false },
    { label: 'NCC Miền Nam', price: 1420000, isBest: false },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">UI Components Demo</h1>
        <p className="text-muted-foreground mt-2">
          Showcase của các component UI tái sử dụng cho QuoteMaster V3.2
        </p>
      </div>

      {/* Region Autocomplete Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Region Autocomplete</CardTitle>
          <CardDescription>
            Component tự động hoàn thành cho việc chọn khu vực từ danh sách teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Khu vực:</label>
              <RegionAutocomplete
                value={selectedRegion}
                onValueChange={setSelectedRegion}
                placeholder="Chọn khu vực..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Giá trị đã chọn:</label>
              <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                {selectedRegion || 'Chưa chọn khu vực'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRegion('Hà Nội')}
            >
              Set Hà Nội
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRegion('TP.HCM')}
            >
              Set TP.HCM
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRegion('')}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Badge Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Price Badge</CardTitle>
          <CardDescription>
            Component hiển thị giá với định dạng tiền tệ Việt Nam và highlight giá tốt nhất
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Price Badges */}
          <div>
            <h4 className="font-medium mb-3">Basic Price Badges</h4>
            <div className="flex flex-wrap gap-3">
              <PriceBadge price={1250000} />
              <PriceBadge price={1250000} isBestPrice={true} />
              <PriceBadge price={1250000} showCurrency={false} />
              <PriceBadge price={1250000} currency="USD" />
            </div>
          </div>

          <Separator />

          {/* Size Variants */}
          <div>
            <h4 className="font-medium mb-3">Size Variants</h4>
            <div className="flex flex-wrap items-center gap-3">
              <PriceBadge price={demoPrice} size="sm" />
              <PriceBadge price={demoPrice} size="default" />
              <PriceBadge price={demoPrice} size="lg" />
            </div>
          </div>

          <Separator />

          {/* Specialized Variants */}
          <div>
            <h4 className="font-medium mb-3">Specialized Variants</h4>
            <div className="flex flex-wrap gap-3">
              <BestPriceBadge price={demoPrice} />
              <RegularPriceBadge price={demoPrice + 150000} />
            </div>
          </div>

          <Separator />

          {/* Interactive Demo */}
          <div>
            <h4 className="font-medium mb-3">Interactive Demo</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoPrice(1000000)}
                >
                  1M ₫
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoPrice(1250000)}
                >
                  1.25M ₫
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoPrice(1500000)}
                >
                  1.5M ₫
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoPrice(Math.floor(Math.random() * 2000000) + 500000)}
                >
                  Random
                </Button>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <PriceBadge price={demoPrice} isBestPrice={true} size="lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison</CardTitle>
          <CardDescription>
            Component so sánh giá từ nhiều nhà cung cấp với highlight giá tốt nhất
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PriceComparison prices={samplePrices} />

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Different Sizes</h4>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Small:</span>
                <PriceComparison prices={samplePrices.slice(0, 3)} size="sm" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Large:</span>
                <PriceComparison prices={samplePrices.slice(0, 3)} size="lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Ví dụ Sử dụng trong Form</CardTitle>
          <CardDescription>
            Demo tích hợp các component trong form thực tế
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Khu vực báo giá:</label>
                <RegionAutocomplete
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  placeholder="Chọn khu vực..."
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Giá ước tính:</label>
                <div className="mt-1">
                  <BestPriceBadge price={demoPrice} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Thông tin hiện tại:</label>
                <div className="mt-1 p-3 bg-muted rounded-md text-sm space-y-1">
                  <div><strong>Khu vực:</strong> {selectedRegion || 'Chưa chọn'}</div>
                  <div><strong>Giá:</strong> {demoPrice.toLocaleString('vi-VN')} ₫</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ComponentsDemo;