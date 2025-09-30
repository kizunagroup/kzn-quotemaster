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
import { ComparisonMatrix } from "@/components/features/quote-comparison/comparison-matrix";
import { getAvailablePeriods } from "@/lib/actions/quotations.actions";
import {
  getComparisonMatrix,
  getRegionsForPeriod,
  getCategoriesForPeriodAndRegion
} from "@/lib/actions/quote-comparison.actions";
import { type ComparisonMatrixData } from "@/lib/types/quote-comparison.types";
import { Loader2 } from "lucide-react";

export default function ComparisonPage() {
  // Filter states
  const [period, setPeriod] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  // Data for select options
  const [periods, setPeriods] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Loading states for cascading filters
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Error states
  const [filtersError, setFiltersError] = useState<string | null>(null);

  // Comparison matrix state
  const [matrixData, setMatrixData] = useState<ComparisonMatrixData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Fetch periods on component mount
  useEffect(() => {
    async function fetchPeriods() {
      try {
        setPeriodsLoading(true);
        setFiltersError(null);

        const availablePeriods = await getAvailablePeriods();
        setPeriods(availablePeriods);
      } catch (err) {
        console.error("Error fetching periods:", err);
        setFiltersError("Không thể tải danh sách kỳ báo giá");
        setPeriods([]);
      } finally {
        setPeriodsLoading(false);
      }
    }

    fetchPeriods();
  }, []);

  // Fetch regions when period changes (cascading filter)
  useEffect(() => {
    if (!period) {
      setRegions([]);
      setRegion("");
      return;
    }

    async function fetchRegions() {
      try {
        setRegionsLoading(true);
        setFiltersError(null);

        const availableRegions = await getRegionsForPeriod(period);
        setRegions(availableRegions);

        // Clear region selection if current region is not available
        if (region && !availableRegions.includes(region)) {
          setRegion("");
        }
      } catch (err) {
        console.error("Error fetching regions for period:", err);
        setFiltersError("Không thể tải danh sách khu vực cho kỳ này");
        setRegions([]);
        setRegion("");
      } finally {
        setRegionsLoading(false);
      }
    }

    fetchRegions();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch categories when period or region changes (cascading filter)
  useEffect(() => {
    if (!period || !region) {
      setCategories([]);
      setCategory("");
      return;
    }

    async function fetchCategories() {
      try {
        setCategoriesLoading(true);
        setFiltersError(null);

        const availableCategories = await getCategoriesForPeriodAndRegion(period, region);
        setCategories(availableCategories);

        // Clear category selection if current category is not available
        if (category && !availableCategories.includes(category)) {
          setCategory("");
        }
      } catch (err) {
        console.error("Error fetching categories for period and region:", err);
        setFiltersError("Không thể tải danh sách nhóm hàng cho kỳ và khu vực này");
        setCategories([]);
        setCategory("");
      } finally {
        setCategoriesLoading(false);
      }
    }

    fetchCategories();
  }, [period, region]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <Select value={period} onValueChange={setPeriod} disabled={periodsLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={periodsLoading ? "Đang tải..." : "Chọn kỳ báo giá..."} />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodsLoading && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải kỳ báo giá...
              </div>
            )}
          </div>

          {/* Region Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Khu vực
              {!period && <span className="text-muted-foreground"> (chọn kỳ báo giá trước)</span>}
            </label>
            <Select
              value={region}
              onValueChange={setRegion}
              disabled={!period || regionsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !period
                      ? "Chọn kỳ báo giá trước..."
                      : regionsLoading
                        ? "Đang tải..."
                        : regions.length === 0
                          ? "Không có khu vực nào"
                          : "Chọn khu vực..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {regionsLoading && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải khu vực...
              </div>
            )}
            {period && !regionsLoading && regions.length === 0 && (
              <div className="text-xs text-amber-600">
                Không có khu vực nào có báo giá trong kỳ này
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nhóm hàng
              {(!period || !region) && (
                <span className="text-muted-foreground"> (chọn kỳ & khu vực trước)</span>
              )}
            </label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={!period || !region || categoriesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !period || !region
                      ? "Chọn kỳ & khu vực trước..."
                      : categoriesLoading
                        ? "Đang tải..."
                        : categories.length === 0
                          ? "Không có nhóm hàng nào"
                          : "Chọn nhóm hàng..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoriesLoading && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải nhóm hàng...
              </div>
            )}
            {period && region && !categoriesLoading && categories.length === 0 && (
              <div className="text-xs text-amber-600">
                Không có nhóm hàng nào có báo giá cho kỳ và khu vực này
              </div>
            )}
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