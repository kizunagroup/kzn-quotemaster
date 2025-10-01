"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  List,
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
  const [categories, setCategories] = useState<string[]>([]);

  // Data for select options
  const [periods, setPeriods] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

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

  // Helper functions for multi-select categories
  const handleCategoryToggle = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectAllCategories = () => {
    setCategories([...availableCategories]);
  };

  const handleDeselectAllCategories = () => {
    setCategories([]);
  };

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
      setAvailableCategories([]);
      setCategories([]);
      return;
    }

    async function fetchCategories() {
      try {
        setCategoriesLoading(true);
        setFiltersError(null);

        const fetchedCategories = await getCategoriesForPeriodAndRegion(
          period,
          region
        );
        setAvailableCategories(fetchedCategories);

        // Default to All: Select all categories by default
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Error fetching categories for period and region:", err);
        setFiltersError(
          "Không thể tải danh sách nhóm hàng cho kỳ và khu vực này"
        );
        setAvailableCategories([]);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }

    fetchCategories();
  }, [period, region]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle comparison action
  const handleCompareClick = async () => {
    if (!period || !region || categories.length === 0) {
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
        categories,
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
  const isCompareEnabled =
    period && region && categories.length > 0 && !comparisonLoading;

  // Handle batch negotiation and export
  const handleBatchNegotiationAndExport = async () => {
    if (!period || !region || categories.length === 0) {
      setComparisonError("Vui lòng chọn đầy đủ các tiêu chí để thực hiện");
      return;
    }

    try {
      setBatchActionLoading(true);
      setComparisonError(null);

      const result = await initiateBatchNegotiationAndExport({
        period,
        region,
        categories,
      });

      // Trigger download from the server-generated file
      if (result.success && result.downloadPath) {
        const link = document.createElement("a");
        link.href = result.downloadPath;
        link.download = result.downloadPath.split("/").pop() || "export.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show success message
        toast.success(
          "Đã xuất file giá mục tiêu và khởi tạo đàm phán thành công!"
        );

        // Refresh comparison data after batch action
        await handleCompareClick();
      } else {
        throw new Error("Không nhận được đường dẫn tải file");
      }
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
    if (!period || !region || categories.length === 0) {
      setComparisonError("Vui lòng chọn đầy đủ các tiêu chí để xuất file");
      return;
    }

    try {
      setExportLoading(true);
      setComparisonError(null);

      const blob = await exportTargetPriceFile({
        period,
        region,
        categories,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BangGiaMucTieu_${period}_${region}_${categories.join(
        "+"
      )}_${new Date().toISOString().split("T")[0]}.xlsx`;
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
      <h2 className="text-3xl font-bold tracking-tight">So sánh Báo giá</h2>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Period Filter */}
          <div className="lg:min-w-[200px]">
            <Select
              value={period}
              onValueChange={setPeriod}
              disabled={periodsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={periodsLoading ? "Đang tải..." : "Kỳ báo giá..."}
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
          </div>

          {/* Region Filter */}
          <div className="lg:min-w-[200px]">
            <Select
              value={region}
              onValueChange={setRegion}
              disabled={!period || regionsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !period
                      ? "Khu vực (chọn kỳ trước)..."
                      : regionsLoading
                      ? "Đang tải..."
                      : regions.length === 0
                      ? "Không có khu vực"
                      : "Khu vực..."
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
          </div>

          {/* Category Multi-Select Filter - Dropdown with Checkboxes */}
          <div className="lg:min-w-[300px] lg:flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  disabled={!period || !region || categoriesLoading}
                >
                  {categoriesLoading ? (
                    <span className="text-muted-foreground">Đang tải...</span>
                  ) : !period || !region ? (
                    <span className="text-muted-foreground">
                      Nhóm hàng (chọn kỳ & khu vực)...
                    </span>
                  ) : availableCategories.length === 0 ? (
                    <span className="text-muted-foreground">
                      Không có nhóm hàng
                    </span>
                  ) : categories.length === 0 ? (
                    <span className="text-muted-foreground">Nhóm hàng...</span>
                  ) : (
                    <span>Nhóm hàng ({categories.length})</span>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px]">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Chọn nhóm hàng</span>
                  <div className="flex gap-2 text-xs font-normal">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="text-blue-600 hover:underline"
                    >
                      Tất cả
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllCategories}
                      className="text-blue-600 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableCategories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={categories.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Compare Button */}
          <div>
            <Button
              onClick={handleCompareClick}
              disabled={!isCompareEnabled}
              className="min-w-[120px] w-full lg:w-auto"
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

        {/* Error Display for Filters */}
        {filtersError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 mt-4">
            {filtersError}
          </div>
        )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
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
                    {formatPercentage(
                      matrixData.overviewKPIs.comparisonVsInitial.percentage
                    )}
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
                        {formatPercentage(
                          matrixData.overviewKPIs.comparisonVsPrevious
                            .percentage
                        )}
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
                        {formatPercentage(
                          matrixData.overviewKPIs.comparisonVsBase.percentage
                        )}
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
      {isDetailsVisible && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết so sánh</CardTitle>
            {period && region && categories.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Kỳ: {period} | Khu vực: {region} | Nhóm hàng:{" "}
                {categories.join(", ")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {comparisonLoading ? (
              <div className="text-center text-gray-500 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-lg">Đang tải ma trận so sánh...</p>
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
        </Card>
      )}

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
