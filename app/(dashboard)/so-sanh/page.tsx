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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
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
  ArrowUp,
  ArrowDown,
  List,
  ChevronDown,
  AlertTriangle,
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
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  // Quick View filter state for details matrix
  type QuickViewFilter = 'all' | 'price_increase' | 'price_decrease' | 'no_quotes';
  const [activeFilter, setActiveFilter] = useState<QuickViewFilter>('all');

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
            <div className="space-y-4">
              {/* New Grouped Overview: Region > Category > Supplier Performance */}
              {matrixData.groupedOverview && matrixData.groupedOverview.regions.length > 0 ? (
                <div className="space-y-4">
                  {matrixData.groupedOverview.regions.map((regionData) => (
                    <div key={regionData.region} className="space-y-3">
                      {regionData.categories.map((categoryData, categoryIndex) => (
                        <div key={`${regionData.region}-${categoryData.category}`}>
                          <Accordion type="single" collapsible defaultValue={categoryData.category}>
                            <AccordionItem value={categoryData.category} className="border-none">
                              <AccordionTrigger className="text-left hover:no-underline py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-base">
                                    {regionData.region} - {categoryData.category}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {categoryData.supplierPerformances.length} NCC
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                            <AccordionContent>
                              <div className="rounded-md border overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="min-w-[180px]">Nhà cung cấp</TableHead>
                                      <TableHead className="text-center min-w-[60px]">SP</TableHead>
                                      <TableHead className="text-right min-w-[120px]">Giá trị cơ sở</TableHead>
                                      <TableHead className="text-right min-w-[120px]">Giá trị kỳ trước</TableHead>
                                      <TableHead className="text-right min-w-[120px]">Giá trị báo giá</TableHead>
                                      <TableHead className="text-right min-w-[140px]">Giá trị hiện tại</TableHead>
                                      <TableHead className="text-center min-w-[120px]">So với cơ sở</TableHead>
                                      <TableHead className="text-center min-w-[120px]">So với kỳ trước</TableHead>
                                      <TableHead className="text-center min-w-[120px]">So với báo giá</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {categoryData.supplierPerformances.map((supplier) => {
                                      // Light background color for "Giá trị hiện tại" based on quotation status
                                      const getCurrentValueBgColor = () => {
                                        if (supplier.quotationStatus === 'approved') {
                                          return "bg-green-50";
                                        }
                                        if (supplier.quotationStatus === 'negotiation') {
                                          return "bg-orange-50";
                                        }
                                        return "";
                                      };

                                      // Helper to render variance cell - always show color and icon
                                      const renderVarianceCell = (variance: { difference: number; percentage: number } | null) => {
                                        if (!variance) {
                                          return <span className="text-gray-400 text-sm">-</span>;
                                        }

                                        const isIncrease = variance.percentage > 0;
                                        const isDecrease = variance.percentage < 0;

                                        return (
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="flex items-center gap-1">
                                              {isIncrease && (
                                                <TrendingUp className="h-3 w-3 text-red-600" />
                                              )}
                                              {isDecrease && (
                                                <TrendingDown className="h-3 w-3 text-green-600" />
                                              )}
                                              <span
                                                className={
                                                  isIncrease
                                                    ? "text-red-600 font-medium"
                                                    : isDecrease
                                                    ? "text-green-600 font-medium"
                                                    : "text-gray-600"
                                                }
                                              >
                                                {variance.difference > 0 ? "+" : ""}
                                                {formatNumber(variance.difference)}
                                              </span>
                                            </div>
                                            <span
                                              className={`text-xs ${
                                                isIncrease
                                                  ? "text-red-600"
                                                  : isDecrease
                                                  ? "text-green-600"
                                                  : "text-gray-600"
                                              }`}
                                            >
                                              ({variance.percentage > 0 ? "+" : ""}
                                              {formatPercentage(variance.percentage)})
                                            </span>
                                          </div>
                                        );
                                      };

                                      return (
                                        <TableRow key={supplier.supplierId}>
                                          <TableCell>
                                            <div>
                                              <div className="font-medium">{supplier.supplierCode}</div>
                                              <div className="text-xs text-muted-foreground">{supplier.supplierName}</div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center font-narrow">{supplier.productCount}</TableCell>
                                          <TableCell className="text-right font-narrow">{formatNumber(supplier.totalBaseValue)}</TableCell>
                                          <TableCell className="text-right font-narrow">
                                            {supplier.totalPreviousValue !== null
                                              ? formatNumber(supplier.totalPreviousValue)
                                              : "-"}
                                          </TableCell>
                                          <TableCell className="text-right font-narrow">{formatNumber(supplier.totalInitialValue)}</TableCell>
                                          <TableCell className={`text-right font-narrow ${getCurrentValueBgColor()}`}>
                                            {formatNumber(supplier.totalCurrentValue)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {renderVarianceCell(supplier.varianceVsBase)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {renderVarianceCell(supplier.varianceVsPrevious)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {renderVarianceCell(supplier.varianceVsInitial)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                          {/* Add separator between groups, but not after the last one */}
                          {categoryIndex < regionData.categories.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Không có dữ liệu tổng quan theo nhóm.</p>
                </div>
              )}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chi tiết so sánh</CardTitle>
                {period && region && categories.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Kỳ: {period} | Khu vực: {region} | Nhóm hàng:{" "}
                    {categories.join(", ")}
                  </p>
                )}
              </div>
              {/* Quick View Filters */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  className={activeFilter === 'all' ? 'bg-muted' : ''}
                >
                  Tất cả
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter('price_increase')}
                  className={`flex items-center gap-1 ${activeFilter === 'price_increase' ? 'bg-muted' : ''}`}
                >
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Tăng giá</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter('price_decrease')}
                  className={`flex items-center gap-1 ${activeFilter === 'price_decrease' ? 'bg-muted' : ''}`}
                >
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Giảm giá</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveFilter('no_quotes')}
                  className={`flex items-center gap-1 ${activeFilter === 'no_quotes' ? 'bg-muted' : ''}`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Chưa báo giá
                </Button>
              </div>
            </div>
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
              <ComparisonMatrix matrixData={matrixData} activeFilter={activeFilter} />
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
