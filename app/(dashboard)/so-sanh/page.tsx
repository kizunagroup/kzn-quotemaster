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
import { ComparisonMatrix } from "@/components/features/quote-comparison/comparison-matrix";
import { getAvailablePeriods, getAvailableCategories } from "@/lib/actions/quotations.actions";
import { getComparisonMatrix, type ComparisonMatrixData } from "@/lib/actions/quote-comparison.actions";
import { Loader2 } from "lucide-react";

export default function ComparisonPage() {
  // Filter states
  const [period, setPeriod] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Data for select options
  const [periods, setPeriods] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  // Comparison matrix state
  const [matrixData, setMatrixData] = useState<ComparisonMatrixData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Fetch periods and categories on component mount
  useEffect(() => {
    async function fetchFilterData() {
      try {
        setFiltersLoading(true);
        setFiltersError(null);

        const [availablePeriods, availableCategories] = await Promise.all([
          getAvailablePeriods(),
          getAvailableCategories(),
        ]);

        setPeriods(availablePeriods);
        setCategories(availableCategories);
      } catch (err) {
        console.error("Error fetching filter data:", err);
        setFiltersError("Không thể tải dữ liệu bộ lọc");
        setPeriods([]);
        setCategories([]);
      } finally {
        setFiltersLoading(false);
      }
    }

    fetchFilterData();
  }, []);

  // Handle comparison action
  const handleCompareClick = async () => {
    if (!period || !region || !category) {
      setComparisonError("Vui lòng chọn đầy đủ các tiêu chí lọc");
      return;
    }

    try {
      setComparisonLoading(true);
      setComparisonError(null);
      setMatrixData(null); // Clear previous data

      const result = await getComparisonMatrix({
        period,
        region,
        category,
      });

      setMatrixData(result);
    } catch (err) {
      console.error("Error fetching comparison matrix:", err);
      setComparisonError(
        err instanceof Error
          ? err.message
          : "Không thể tải ma trận so sánh báo giá"
      );
      setMatrixData(null);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Check if compare button should be enabled
  const isCompareEnabled = period && region && category && !comparisonLoading;

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
            <Select value={period} onValueChange={setPeriod} disabled={filtersLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filtersLoading ? "Đang tải..." : "Chọn kỳ báo giá..."} />
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
              disabled={filtersLoading}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nhóm hàng</label>
            <Select value={category} onValueChange={setCategory} disabled={filtersLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={filtersLoading ? "Đang tải..." : "Chọn nhóm hàng..."} />
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

        {/* Error Display for Filters */}
        {filtersError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {filtersError}
          </div>
        )}

        {/* Compare Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCompareClick}
            disabled={!isCompareEnabled}
            className="min-w-[120px]"
          >
            {comparisonLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              "So sánh"
            )}
          </Button>
        </div>
      </div>

      {/* Content Area - Conditional Rendering */}
      {comparisonLoading ? (
        <div className="bg-white rounded-lg border p-8">
          <div className="text-center text-gray-500 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-lg">Đang tải dữ liệu so sánh...</p>
            <p className="text-sm">
              Đang xử lý ma trận so sánh báo giá cho kỳ {period}, khu vực {region}, nhóm hàng {category}.
            </p>
          </div>
        </div>
      ) : comparisonError ? (
        <div className="bg-white rounded-lg border p-8">
          <div className="text-center space-y-4">
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-lg font-medium">Lỗi tải dữ liệu</p>
              <p className="text-sm mt-2">{comparisonError}</p>
            </div>
            <Button
              onClick={handleCompareClick}
              disabled={!isCompareEnabled}
              variant="outline"
            >
              Thử lại
            </Button>
          </div>
        </div>
      ) : matrixData ? (
        <ComparisonMatrix matrixData={matrixData} />
      ) : (
        <div className="bg-white rounded-lg border p-8">
          <div className="text-center text-gray-500 space-y-2">
            <p className="text-lg">Vui lòng chọn các tiêu chí và nhấn 'So sánh' để xem kết quả.</p>
            <p className="text-sm">
              Chọn kỳ báo giá, khu vực và nhóm hàng để hiển thị ma trận so sánh giá từ các nhà cung cấp.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}