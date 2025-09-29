"use client";

import useSWR from "swr";
import { useDataTableUrlState } from "./use-data-table-url-state";

// TypeScript interfaces matching the API response structure
export interface Quotation {
  id: number;
  quotationId: string;
  period: string;
  supplierId: number;
  supplierName: string | null;
  supplierCode: string | null;
  region: string;
  category: string;
  status: string;
  quoteDate: Date | null;
  updateDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  itemCount: number;
}

export interface QuotationsResponse {
  data: Quotation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string | null;
    period?: string | null;
    supplier?: string | null;
    region?: string | null;
    status?: string;
    sort?: string;
    order?: string;
  };
}

// Robust fetcher function with comprehensive error handling
const quotationsFetcher = async (url: string): Promise<QuotationsResponse> => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies for session management
  });

  if (!response.ok) {
    // Handle different HTTP error statuses
    if (response.status === 401) {
      throw new Error("Không có quyền truy cập. Vui lòng đăng nhập lại.");
    }

    if (response.status === 403) {
      throw new Error("Bạn không có quyền xem danh sách báo giá.");
    }

    if (response.status >= 500) {
      throw new Error(
        "Lỗi máy chủ. Không thể tải danh sách báo giá. Vui lòng thử lại sau."
      );
    }

    if (response.status === 400) {
      // Try to get detailed error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || "Tham số yêu cầu không hợp lệ");
      } catch {
        throw new Error("Tham số yêu cầu không hợp lệ");
      }
    }

    // Generic error for other status codes
    throw new Error(
      `Không thể tải danh sách báo giá: ${response.status} ${response.statusText}`
    );
  }

  try {
    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.data)) {
      throw new Error("Định dạng dữ liệu phản hồi không hợp lệ");
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("định dạng")) {
      throw error;
    }
    throw new Error("Định dạng dữ liệu phản hồi không hợp lệ từ máy chủ");
  }
};

// Main SWR hook for quotation data management with URL state integration
export function useQuotations() {
  // Get current URL state for filters, sorting, and pagination
  const {
    filters,
    sort,
    pagination,
    setFilters,
    setSort,
    clearSort,
    setPagination,
    setSearch,
    setFilter,
    clearFilters,
    hasActiveFilters,
    hasActiveFiltersOnly,
    updateUrl,
  } = useDataTableUrlState({
    defaultFilters: { status: "all" },
    defaultSort: { column: "createdAt", order: "desc" }, // Default sort by creation date descending
    defaultPagination: { page: 1, limit: 10 },
  });

  // Build API URL dynamically based on current URL state
  const buildApiUrl = () => {
    const params = new URLSearchParams();

    // Add search filter
    if (filters.search) {
      params.set("search", filters.search);
    }

    // Add period filter
    if (filters.period) {
      params.set("period", filters.period);
    }

    // Add supplier filter (supports both supplier name and supplierId)
    if (filters.supplier) {
      params.set("supplier", filters.supplier);
    }
    if (filters.supplierId) {
      params.set("supplierId", filters.supplierId);
    }

    // Add region filter
    if (filters.region) {
      params.set("region", filters.region);
    }


    // Add status filter
    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }

    // Add sorting
    if (sort.column) {
      params.set("sort", sort.column);
    }
    if (sort.order) {
      params.set("order", sort.order);
    }

    // Add pagination
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());

    return `/api/quotations?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for quotation data
  const { data, error, isLoading, mutate } = useSWR<QuotationsResponse>(
    apiUrl,
    quotationsFetcher,
    {
      // Performance optimizations
      revalidateOnFocus: false, // Don't refetch when window gains focus
      revalidateOnReconnect: true, // Refetch when connection is restored
      dedupingInterval: 30000, // Dedupe requests for 30 seconds
      errorRetryCount: 3, // Retry failed requests 3 times
      errorRetryInterval: 1000, // Wait 1 second between retries

      // Cache management
      shouldRetryOnError: (error) => {
        // Don't retry on authentication/authorization errors
        if (
          error?.message?.includes("quyền truy cập") ||
          error?.message?.includes("quyền xem") ||
          error?.message?.includes("Unauthorized") ||
          error?.message?.includes("Forbidden")
        ) {
          return false;
        }
        // Retry on network/server errors
        return true;
      },

      // Performance monitoring
      onError: (error) => {
        console.error("Quotation data fetch error:", error.message);
      },

      // Success callback for debugging (development only)
      onSuccess: (data) => {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `Quotation data loaded: ${data.data.length} quotations found`
          );
        }
      },

      // Keep data fresh
      refreshInterval: 0, // No automatic polling - use manual refresh
      revalidateIfStale: true, // Revalidate if data is stale
    }
  );

  // Return structured object with all necessary data and functions
  return {
    // Data
    quotations: data?.data || [],
    pagination: data?.pagination,
    filters: data?.filters,

    // State management from URL hook
    urlState: {
      filters,
      sort,
      pagination,
    },

    // State update functions (from URL hook)
    setFilters,
    setSort,
    clearSort,
    setPagination,
    setSearch,
    setFilter,
    clearFilters,
    updateUrl,

    // Filter state indicators
    hasActiveFilters,
    hasActiveFiltersOnly,

    // Loading and error states
    isLoading,
    error,
    // Computed properties for convenience
    isEmpty: !isLoading && (!data?.data || data.data.length === 0),
    isValidating: isLoading, // Alias for consistency

    // Helper methods
    refresh: () => mutate(), // Convenient refresh method (alias for mutate)
    mutate, // Direct access to SWR mutate function

    // Pagination helpers
    hasNextPage: data?.pagination
      ? data.pagination.page < data.pagination.pages
      : false,
    hasPrevPage: data?.pagination ? data.pagination.page > 1 : false,

    // Summary data
    totalQuotations: data?.pagination?.total || 0,
    currentPageSize: data?.data?.length || 0,
    totalPages: data?.pagination?.pages || 0,

    // Quotation-specific helpers
    pendingQuotations:
      data?.data?.filter((quotation) => quotation.status === "pending") || [],
    approvedQuotations:
      data?.data?.filter((quotation) => quotation.status === "approved") || [],
    negotiationQuotations:
      data?.data?.filter((quotation) => quotation.status === "negotiation") || [],
    cancelledQuotations:
      data?.data?.filter((quotation) => quotation.status === "cancelled") || [],

    // Period-based helpers
    getQuotationsByPeriod: (period: string) =>
      data?.data?.filter((quotation) => quotation.period === period) || [],

    // Quotation-specific convenience methods (matching Products pattern)
    searchQuotations: (searchTerm: string) => {
      setSearch(searchTerm);
    },
    filterByPeriod: (period: string) => {
      setFilter("period", period === "all" ? null : period);
    },
    filterBySupplier: (supplier: string) => {
      setFilter("supplier", supplier === "all" ? null : supplier);
    },
    filterByRegion: (region: string) => {
      setFilter("region", region === "all" ? null : region);
    },
    filterByStatus: (status: string) => {
      setFilter("status", status === "all" ? null : status);
    },

    // Data management helpers (from current data)
    regions: Array.from(
      new Set(data?.data?.map((quotation) => quotation.region) || [])
    ).sort(),

    periods: Array.from(
      new Set(data?.data?.map((quotation) => quotation.period) || [])
    ).sort(),

    suppliers: Array.from(
      new Map(
        data?.data?.map((quotation) => [
          quotation.supplierId,
          {
            id: quotation.supplierId,
            name: quotation.supplierName || '',
            code: quotation.supplierCode || '',
          },
        ]) || []
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name)),

    // Quotation lookup helpers
    getQuotationById: (id: number) =>
      data?.data?.find((quotation) => quotation.id === id),
    getQuotationByQuotationId: (quotationId: string) =>
      data?.data?.find(
        (quotation) => quotation.quotationId.toLowerCase() === quotationId.toLowerCase()
      ),

    // Legacy helpers for backward compatibility
    getQuotationsByPeriod: (period: string) =>
      data?.data?.filter((quotation) => quotation.period === period) || [],
    getQuotationsBySupplier: (supplierId: number) =>
      data?.data?.filter((quotation) => quotation.supplierId === supplierId) || [],
  };
}