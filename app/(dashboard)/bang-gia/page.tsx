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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileDown, Search } from "lucide-react";
import {
  getUserAccessibleRegions,
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
  // State management - Hierarchical filter cascade
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [priceListData, setPriceListData] = useState<PriceListMatrixData | null>(null);

  // Loading states
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingKitchens, setLoadingKitchens] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingPriceList, setLoadingPriceList] = useState(false);

  // STEP 1: Load user's accessible regions on mount
  useEffect(() => {
    async function loadRegions() {
      try {
        setLoadingRegions(true);
        const accessibleRegions = await getUserAccessibleRegions();
        setRegions(accessibleRegions);

        // Auto-select first region if available
        if (accessibleRegions.length > 0) {
          setSelectedRegion(accessibleRegions[0]);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải danh sách khu vực");
      } finally {
        setLoadingRegions(false);
      }
    }

    loadRegions();
  }, []);

  // STEP 2: Load kitchens when region changes
  useEffect(() => {
    async function loadKitchens() {
      if (!selectedRegion) {
        setKitchens([]);
        setSelectedTeamId(null);
        setPeriods([]);
        setSelectedPeriod("");
        setPriceListData(null);
        return;
      }

      try {
        setLoadingKitchens(true);
        const accessibleKitchens = await getUserAccessibleKitchens(selectedRegion);
        setKitchens(accessibleKitchens);

        // Auto-select first kitchen if available
        if (accessibleKitchens.length > 0) {
          setSelectedTeamId(accessibleKitchens[0].id);
        } else {
          setSelectedTeamId(null);
          toast.info(`Không có bếp nào trong khu vực ${selectedRegion}`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải danh sách bếp");
        setKitchens([]);
        setSelectedTeamId(null);
      } finally {
        setLoadingKitchens(false);
      }
    }

    loadKitchens();
  }, [selectedRegion]);

  // STEP 3: Load available periods when kitchen changes
  useEffect(() => {
    async function loadPeriods() {
      if (!selectedTeamId) {
        setPeriods([]);
        setSelectedPeriod("");
        setPriceListData(null);
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
      toast.error("Vui lòng chọn đầy đủ khu vực, bếp và kỳ báo giá");
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Bảng giá Bếp</h2>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Region Select */}
        <div className="lg:min-w-[200px]">
          <Select
            value={selectedRegion}
            onValueChange={(value) => {
              setSelectedRegion(value);
              setPriceListData(null);
            }}
            disabled={loadingRegions}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingRegions ? "Đang tải..." : "Khu vực..."} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kitchen Select */}
        <div className="lg:min-w-[240px]">
          <Select
            value={selectedTeamId?.toString() || ""}
            onValueChange={(value) => {
              setSelectedTeamId(Number(value));
              setPriceListData(null);
            }}
            disabled={!selectedRegion || loadingKitchens}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !selectedRegion
                    ? "Bếp (chọn khu vực trước)..."
                    : loadingKitchens
                    ? "Đang tải..."
                    : kitchens.length === 0
                    ? "Không có bếp"
                    : "Bếp..."
                }
              />
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
        <div className="lg:min-w-[260px]">
          <Select
            value={selectedPeriod}
            onValueChange={(value) => {
              setSelectedPeriod(value);
              setPriceListData(null);
            }}
            disabled={!selectedTeamId || loadingPeriods}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !selectedTeamId
                    ? "Kỳ báo giá (chọn bếp trước)..."
                    : loadingPeriods
                    ? "Đang tải..."
                    : periods.length === 0
                    ? "Không có kỳ báo giá"
                    : "Kỳ báo giá..."
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
        <div>
          <Button
            onClick={handleViewPriceList}
            disabled={!selectedTeamId || !selectedPeriod || loadingPriceList}
            className="min-w-[120px] w-full lg:w-auto"
          >
            {loadingPriceList ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              "Xem"
            )}
          </Button>
        </div>

        <div>
          <Button variant="outline" onClick={handleExport} disabled={!priceListData} className="w-full lg:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      </div>

      {/* Price Matrix Display */}
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
        <PriceMatrix priceListData={priceListData} />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">
                Chọn khu vực, bếp và kỳ báo giá để xem bảng giá
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
