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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparisonMatrix } from "@/components/features/quote-comparison/comparison-matrix";
import { getAvailablePeriods } from "@/lib/actions/quotations.actions";
import {
  getComparisonMatrix,
  getRegionsForPeriod,
  getCategoriesForPeriodAndRegion,
} from "@/lib/actions/quote-comparison.actions";
import { type ComparisonMatrixData } from "@/lib/types/quote-comparison.types";
import {
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  exportTargetPriceFile,
  initiateBatchNegotiationAndExport,
} from "@/lib/actions/quote-comparison.actions";
import { ApprovalModal } from "@/components/features/quote-comparison/approval-modal";
import { toast } from "sonner";
import { formatNumber, formatPercentage } from "@/lib/utils";

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
  const [matrixData, setMatrixData] = useState<ComparisonMatrixData | null>(
    null
  );
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Action loading states
  const [exportLoading, setExportLoading] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  // UI state
  const [isDetailsVisible, setIsDetailsVisible] = useState(true);

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

        const availableCategories = await getCategoriesForPeriodAndRegion(
          period,
          region
        );
        setCategories(availableCategories);

        // Clear category selection if current category is not available
        if (category && !availableCategories.includes(category)) {
          setCategory("");
        }
      } catch (err) {
        console.error("Error fetching categories for period and region:", err);
        setFiltersError(
          "Không thể tải danh sách nhóm hàng cho kỳ và khu vực này"
        );
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

  // Handle batch negotiation and export
  const handleBatchNegotiationAndExport = async () => {
    if (!period || !region || !category) {
      setComparisonError("Vui lòng chọn đầy đủ các tiêu chí để thực hiện");
      return;
    }

    try {
      setBatchActionLoading(true);
      setComparisonError(null);

      const blob = await initiateBatchNegotiationAndExport({
        period,
        region,
        category,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GiaMucTieu_DamPhan_${period}_${region}_${category}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      toast.success(
        "Đã xuất file giá mục tiêu và khởi tạo đàm phán thành công!"
      );

      // Refresh comparison data after batch action
      await handleCompareClick();
    } catch (err) {
      console.error("Error in batch negotiation and export:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Không thể thực hiện đàm phán hàng loạt và xuất file";

      setComparisonError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Handle approval modal
  const handleOpenApprovalModal = () => {
    if (!matrixData || matrixData.availableSuppliers.length === 0) {
      setComparisonError("Không có dữ liệu nhà cung cấp để phê duyệt");
      return;
    }
    setApprovalModalOpen(true);
  };

  // Handle export action
  const handleExportClick = async () => {
    if (!period || !region || !category) {
      setComparisonError("Vui lòng chọn đầy đủ các tiêu chí để xuất file");
      return;
    }

    try {
      setExportLoading(true);
      setComparisonError(null);

      const blob = await exportTargetPriceFile({
        period,
        region,
        category,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BangGiaMucTieu_${period}_${region}_${category}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting target price file:", err);
      setComparisonError(
        err instanceof Error ? err.message : "Không thể xuất bảng giá mục tiêu"
      );
    } finally {
      setExportLoading(false);
    }
  };

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
            <Select
              value={period}
              onValueChange={setPeriod}
              disabled={periodsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    periodsLoading ? "Đang tải..." : "Chọn kỳ báo giá..."
                  }
                />
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
              {!period && (
                <span className="text-muted-foreground">
                  {" "}
                  (chọn kỳ báo giá trước)
                </span>
              )}
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
                <span className="text-muted-foreground">
                  {" "}
                  (chọn kỳ & khu vực trước)
                </span>
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
            {period &&
              region &&
              !categoriesLoading &&
              categories.length === 0 && (
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

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-gray-50 rounded-lg text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Ý nghĩa màu sắc:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border rounded"></div>
            <span>Đã duyệt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border rounded font-bold text-green-600 flex items-center justify-center text-xs">
              G
            </div>
            <span>Giá tốt nhất</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border rounded text-orange-600 flex items-center justify-center text-xs">
              N
            </div>
            <span>Đàm phán</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Thay đổi giá:</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-red-600" />
            <span>Tăng</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-green-600" />
            <span>Giảm</span>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Tổng quan</CardTitle>
          {matrixData && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBatchNegotiationAndExport}
                disabled={batchActionLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Xuất & Đàm phán
              </Button>
              <Button
                onClick={handleOpenApprovalModal}
                disabled={
                  !matrixData || matrixData.availableSuppliers.length === 0
                }
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Duyệt giá
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {comparisonLoading ? (
            <div className="text-center text-gray-500 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-lg">Đang tải dữ liệu tổng quan...</p>
            </div>
          ) : comparisonError ? (
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
          ) : matrixData ? (
            <div className="space-y-6">
              {/* Main KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Current Value */}
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Tổng giá trị hiện tại
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatNumber(matrixData.overviewKPIs.totalCurrentValue)}
                  </p>
                </div>

                {/* Comparison vs Initial */}
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    So với giá ban đầu
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      matrixData.overviewKPIs.comparisonVsInitial.percentage > 0
                        ? "text-red-600"
                        : matrixData.overviewKPIs.comparisonVsInitial
                            .percentage < 0
                        ? "text-green-600"
                        : "text-gray-600"
                    }`}
                  >
                    {matrixData.overviewKPIs.comparisonVsInitial.percentage > 0
                      ? "+"
                      : ""}
                    {formatPercentage(matrixData.overviewKPIs.comparisonVsInitial.percentage)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {matrixData.overviewKPIs.comparisonVsInitial.difference > 0
                      ? "+"
                      : ""}
                    {formatNumber(
                      matrixData.overviewKPIs.comparisonVsInitial.difference
                    )}
                  </p>
                </div>

                {/* Comparison vs Previous */}
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    So với kỳ trước
                  </p>
                  {matrixData.overviewKPIs.comparisonVsPrevious
                    .hasPreviousData ? (
                    <>
                      <p
                        className={`text-2xl font-bold ${
                          matrixData.overviewKPIs.comparisonVsPrevious
                            .percentage > 0
                            ? "text-red-600"
                            : matrixData.overviewKPIs.comparisonVsPrevious
                                .percentage < 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {matrixData.overviewKPIs.comparisonVsPrevious
                          .percentage > 0
                          ? "+"
                          : ""}
                        {formatPercentage(matrixData.overviewKPIs.comparisonVsPrevious.percentage)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {matrixData.overviewKPIs.comparisonVsPrevious
                          .difference > 0
                          ? "+"
                          : ""}
                        {formatNumber(
                          matrixData.overviewKPIs.comparisonVsPrevious
                            .difference
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-400">N/A</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Không có dữ liệu kỳ trước
                      </p>
                    </>
                  )}
                </div>

                {/* Comparison vs Base */}
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    So với nhu cầu cơ bản
                  </p>
                  {matrixData.overviewKPIs.comparisonVsBase.hasBaseData ? (
                    <>
                      <p
                        className={`text-2xl font-bold ${
                          matrixData.overviewKPIs.comparisonVsBase.percentage >
                          0
                            ? "text-red-600"
                            : matrixData.overviewKPIs.comparisonVsBase
                                .percentage < 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {matrixData.overviewKPIs.comparisonVsBase.percentage > 0
                          ? "+"
                          : ""}
                        {formatPercentage(matrixData.overviewKPIs.comparisonVsBase.percentage)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {matrixData.overviewKPIs.comparisonVsBase.difference > 0
                          ? "+"
                          : ""}
                        {formatNumber(
                          matrixData.overviewKPIs.comparisonVsBase.difference
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-400">N/A</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nhu cầu bằng cơ bản
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Statistics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
                  <p className="text-xl font-semibold text-gray-700">
                    {matrixData.overviewKPIs.totalProducts}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Nhà cung cấp</p>
                  <p className="text-xl font-semibold text-gray-700">
                    {matrixData.overviewKPIs.totalSuppliers}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Có giá kỳ trước
                  </p>
                  <p className="text-xl font-semibold text-gray-700">
                    {matrixData.overviewKPIs.productsWithPrevious} SP
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 space-y-2">
              <p className="text-lg">
                Vui lòng chọn các tiêu chí và nhấn 'So sánh' để xem tổng quan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Chi tiết so sánh</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDetailsVisible(!isDetailsVisible)}
            className="h-8 w-8"
          >
            {isDetailsVisible ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isDetailsVisible && (
          <CardContent>
            {comparisonLoading ? (
              <div className="text-center text-gray-500 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-lg">Đang tải ma trận so sánh...</p>
                <p className="text-sm">
                  Đang xử lý ma trận so sánh báo giá cho kỳ {period}, khu vực{" "}
                  {region}, nhóm hàng {category}.
                </p>
              </div>
            ) : comparisonError ? (
              <div className="text-center space-y-4">
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-lg font-medium">
                    Lỗi tải dữ liệu chi tiết
                  </p>
                  <p className="text-sm mt-2">{comparisonError}</p>
                </div>
              </div>
            ) : matrixData ? (
              <ComparisonMatrix matrixData={matrixData} />
            ) : (
              <div className="text-center text-gray-500 space-y-2">
                <p className="text-lg">
                  Chọn các tiêu chí và nhấn 'So sánh' để xem chi tiết ma trận.
                </p>
                <p className="text-sm">
                  Ma trận sẽ hiển thị so sánh giá từ các nhà cung cấp cho từng
                  sản phẩm.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Approval Modal */}
      {matrixData && (
        <ApprovalModal
          open={approvalModalOpen}
          onOpenChange={setApprovalModalOpen}
          suppliers={matrixData.availableSuppliers}
          onApprovalComplete={() => {
            setApprovalModalOpen(false);
            handleCompareClick(); // Refresh data
          }}
        />
      )}
    </div>
  );
}
