"use client";

import useSWR from "swr";
import { useDataTableUrlState } from "./use-data-table-url-state";

// TypeScript interfaces matching the API response structure
export interface Team {
  id: number;
  teamCode: string | null;
  name: string;
  region: string;
  address?: string;
  managerId?: number;
  managerName?: string;
  managerEmail?: string;
  teamType: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt?: Date | null;
}

export interface TeamsResponse {
  data: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    region?: string;
    status?: string;
    teamType?: string;
    sort?: string;
    order?: string;
  };
}

// Robust fetcher function with comprehensive error handling
const fetchTeams = async (url: string): Promise<TeamsResponse> => {
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
      throw new Error("Bạn không có quyền xem danh sách nhóm.");
    }

    if (response.status >= 500) {
      throw new Error(
        "Lỗi máy chủ. Không thể tải danh sách nhóm. Vui lòng thử lại sau."
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
      `Không thể tải danh sách nhóm: ${response.status} ${response.statusText}`
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

// Main SWR hook for team data management with URL state integration
export function useTeams() {
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
    defaultFilters: {},
    defaultSort: { column: "createdAt", order: "desc" }, // Default sort by creation date descending
    defaultPagination: { page: 1, limit: 10 },
  });

  // Build API URL dynamically based on current URL state
  const buildApiUrl = () => {
    const params = new URLSearchParams();

    // Add filters
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.region && filters.region !== "all") {
      params.set("region", filters.region);
    }
    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }
    if (filters.teamType && filters.teamType !== "all") {
      params.set("teamType", filters.teamType);
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

    return `/api/teams?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for team data
  const { data, error, isLoading, mutate } = useSWR<TeamsResponse>(
    apiUrl,
    fetchTeams,
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
        console.error("Team data fetch error:", error.message);
      },

      // Success callback for debugging (development only)
      onSuccess: (data) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`Team data loaded: ${data.data.length} teams found`);
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
    teams: data?.data || [],
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

    // Utility properties
    hasActiveFilters,

    // Pagination helpers
    hasNextPage: data?.pagination
      ? data.pagination.page < data.pagination.pages
      : false,
    hasPrevPage: data?.pagination ? data.pagination.page > 1 : false,

    // Summary data
    totalTeams: data?.pagination?.total || 0,
    currentPageSize: data?.data?.length || 0,
    totalPages: data?.pagination?.pages || 0,

    // Team-specific helpers
    activeTeams: data?.data?.filter((team) => team.status === "active") || [],
    inactiveTeams:
      data?.data?.filter((team) => team.status === "inactive") || [],

    // Team type breakdown
    kitchenTeams:
      data?.data?.filter((team) => team.teamType === "KITCHEN") || [],
    officeTeams: data?.data?.filter((team) => team.teamType === "OFFICE") || [],

    // Team lookup helpers
    getTeamById: (id: number) => data?.data?.find((team) => team.id === id),
    getTeamByCode: (code: string) =>
      data?.data?.find(
        (team) => team.teamCode?.toLowerCase() === code.toLowerCase()
      ),
  };
}

// Export types for external use
export type { Team, TeamsResponse };
