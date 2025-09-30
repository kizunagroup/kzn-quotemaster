"use client";

import { useState, useEffect } from "react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegionAutocomplete } from "@/components/ui/region-autocomplete";
import { getAvailablePeriods, getAvailableCategories } from "@/lib/actions/quotations.actions";

export default function ComparisonPage() {
  // Filter states
  const [period, setPeriod] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Data for select options
  const [periods, setPeriods] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch periods and categories on component mount
  useEffect(() => {
    async function fetchFilterData() {
      try {
        setLoading(true);
        setError(null);

        const [availablePeriods, availableCategories] = await Promise.all([
          getAvailablePeriods(),
          getAvailableCategories(),
        ]);

        setPeriods(availablePeriods);
        setCategories(availableCategories);
      } catch (err) {
        console.error("Error fetching filter data:", err);
        setError("Không thể tải dữ liệu bộ lọc");
        setPeriods([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFilterData();
  }, []);

  // Handle comparison action
  const handleCompare = () => {
    // TODO: This will be implemented when comparison matrix component is ready
    console.log("Compare with filters:", { period, region, category });
  };

  // Check if compare button should be enabled
  const isCompareEnabled = period && region && category;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">So sánh Báo giá</h2>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-semibold">Bộ lọc so sánh</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kỳ báo giá</label>
            <Select value={period} onValueChange={setPeriod} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Đang tải..." : "Chọn kỳ báo giá..."} />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Khu vực</label>
            <RegionAutocomplete
              value={region}
              onValueChange={setRegion}
              placeholder="Chọn khu vực..."
              disabled={loading}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nhóm hàng</label>
            <Select value={category} onValueChange={setCategory} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Đang tải..." : "Chọn nhóm hàng..."} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </div>
        )}

        {/* Compare Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCompare}
            disabled={!isCompareEnabled || loading}
            className="min-w-[120px]"
          >
            So sánh
          </Button>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg border p-8">
        <div className="text-center text-gray-500 space-y-2">
          <p className="text-lg">Vui lòng chọn các tiêu chí và nhấn 'So sánh' để xem kết quả.</p>
          <p className="text-sm">
            Chọn kỳ báo giá, khu vực và nhóm hàng để hiển thị ma trận so sánh giá từ các nhà cung cấp.
          </p>
        </div>
      </div>
    </div>
  );
}