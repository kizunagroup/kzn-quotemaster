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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileDown, Search } from "lucide-react";
import {
  getUserAccessibleKitchens,
  getAvailablePeriodsForTeam,
  getPriceListMatrix,
} from "@/lib/actions/price-list.actions";
import type { PeriodInfo, PriceListMatrixData } from "@/lib/types/price-list.types";
import { toast } from "sonner";
import { PriceMatrix } from "@/components/features/price-list/price-matrix";

interface Kitchen {
  id: number;
  name: string;
  kitchenCode: string;
  region: string;
  status: string;
}

export default function PriceListPage() {

  // State management
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [priceListData, setPriceListData] = useState<PriceListMatrixData | null>(null);

  // Loading states
  const [loadingKitchens, setLoadingKitchens] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingPriceList, setLoadingPriceList] = useState(false);

  // Load user's accessible kitchens on mount
  useEffect(() => {
    async function loadKitchens() {
      try {
        setLoadingKitchens(true);
        const accessibleKitchens = await getUserAccessibleKitchens();
        setKitchens(accessibleKitchens);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải danh sách bếp");
      } finally {
        setLoadingKitchens(false);
      }
    }

    loadKitchens();
  }, []);

  // Load available periods when kitchen is selected
  useEffect(() => {
    async function loadPeriods() {
      if (!selectedTeamId) {
        setPeriods([]);
        setSelectedPeriod("");
        return;
      }

      try {
        setLoadingPeriods(true);
        const availablePeriods = await getAvailablePeriodsForTeam({ teamId: selectedTeamId });
        setPeriods(availablePeriods);

        // Auto-select the most recent period
        if (availablePeriods.length > 0) {
          setSelectedPeriod(availablePeriods[0].period);
        } else {
          setSelectedPeriod("");
          toast.info("Không có kỳ báo giá nào cho bếp này");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải danh sách kỳ báo giá");
        setPeriods([]);
        setSelectedPeriod("");
      } finally {
        setLoadingPeriods(false);
      }
    }

    loadPeriods();
  }, [selectedTeamId]);

  // Handle view price list
  const handleViewPriceList = async () => {
    if (!selectedTeamId || !selectedPeriod) {
      toast.error("Vui lòng chọn bếp và kỳ báo giá");
      return;
    }

    try {
      setLoadingPriceList(true);
      const data = await getPriceListMatrix({
        teamId: selectedTeamId,
        period: selectedPeriod,
      });
      setPriceListData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải bảng giá");
      setPriceListData(null);
    } finally {
      setLoadingPriceList(false);
    }
  };

  // Handle export (placeholder for now)
  const handleExport = () => {
    toast.info("Tính năng xuất Excel sẽ được cập nhật trong phiên bản tiếp theo");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bảng giá Bếp</h1>
        <p className="text-muted-foreground mt-2">
          Xem và quản lý bảng giá sản phẩm cho từng bếp theo kỳ báo giá
        </p>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Kitchen Select */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Bếp</label>
              <Select
                value={selectedTeamId?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedTeamId(Number(value));
                  setPriceListData(null); // Clear previous data
                }}
                disabled={loadingKitchens}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingKitchens ? "Đang tải..." : "Chọn bếp"} />
                </SelectTrigger>
                <SelectContent>
                  {kitchens.map((kitchen) => (
                    <SelectItem key={kitchen.id} value={kitchen.id.toString()}>
                      {kitchen.name} ({kitchen.kitchenCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Select */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Kỳ báo giá</label>
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  setSelectedPeriod(value);
                  setPriceListData(null); // Clear previous data
                }}
                disabled={!selectedTeamId || loadingPeriods}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedTeamId
                        ? "Chọn bếp trước"
                        : loadingPeriods
                        ? "Đang tải..."
                        : "Chọn kỳ báo giá"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.period} value={period.period}>
                      {period.period} ({period.approvedQuotations} báo giá)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-end">
              <Button
                onClick={handleViewPriceList}
                disabled={!selectedTeamId || !selectedPeriod || loadingPriceList}
                className="w-full md:w-auto"
              >
                {loadingPriceList ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Xem
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!priceListData}
                className="w-full md:w-auto"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price List Display Area */}
      {loadingPriceList ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Đang tải bảng giá...</p>
            </div>
          </CardContent>
        </Card>
      ) : priceListData ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Bảng giá: {priceListData.teamName} - {priceListData.period}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Khu vực: {priceListData.teamRegion}
              </p>
            </CardHeader>
          </Card>
          <PriceMatrix priceListData={priceListData} />
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">
                Chọn bếp và kỳ báo giá để xem bảng giá
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
