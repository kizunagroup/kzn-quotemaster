"use client";

import useSWR from "swr";
import { useDataTableUrlState } from "./use-data-table-url-state";

// TypeScript interfaces for type safety
export interface Staff {
  id: number;
  employeeCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  hireDate: Date | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Team assignment info (from join)
  currentTeams?: {
    teamId: number;
    teamName: string;
    role: string;
    joinedAt: Date;
  }[];
}

export interface StaffResponse {
  data: Staff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    department?: string;
    status?: string;
    teamId?: number;
    sort?: string;
    order?: string;
  };
}

// Robust fetcher function with comprehensive error handling
const fetcher = async (url: string): Promise<StaffResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    // Handle different HTTP error statuses
    if (response.status === 401) {
      throw new Error("Unauthorized: Please log in to access staff data");
    }

    if (response.status === 403) {
      throw new Error(
        "Forbidden: You do not have permission to view staff data"
      );
    }

    if (response.status >= 500) {
      throw new Error(
        "Server error: Unable to fetch staff data. Please try again later."
      );
    }

    if (response.status === 400) {
      // Try to get detailed error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid request parameters");
      } catch {
        throw new Error("Invalid request parameters");
      }
    }

    // Generic error for other status codes
    throw new Error(
      `Failed to fetch staff: ${response.status} ${response.statusText}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Invalid response format from server");
  }
};

// Main SWR hook for staff data management with URL state integration
export function useStaff() {
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
    updateUrl,
  } = useDataTableUrlState({
    defaultFilters: {},
    defaultSort: { column: "hireDate", order: "asc" }, // FIXED: Default sort by name ascending
    defaultPagination: { page: 1, limit: 10 },
  });

  // Build API URL dynamically based on current URL state
  const buildApiUrl = () => {
    const params = new URLSearchParams();

    // Add filters
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.department && filters.department !== "all") {
      params.set("department", filters.department);
    }
    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }

    // Support for team filter (staff-specific) - using teamId as number
    if (filters.teamId && typeof filters.teamId === "number") {
      params.set("teamId", filters.teamId.toString());
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

    return `/api/staff?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for staff data
  const { data, error, isLoading, mutate } = useSWR<StaffResponse>(
    apiUrl,
    fetcher,
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
        console.error("Staff data fetch error:", error);
      },

      // Success callback for debugging in development
      onSuccess: (data) => {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `Staff data loaded: ${data.data.length} staff members found`
          );
        }
      },
    }
  );

  // Return comprehensive object with all necessary data and functions
  return {
    // Data
    staff: data?.data || [],
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
    totalStaff: data?.pagination?.total || 0,
    currentPageSize: data?.data?.length || 0,
    totalPages: data?.pagination?.pages || 0,

    // Staff-specific helpers
    activeStaff: data?.data?.filter((staff) => staff.status === "active") || [],
    inactiveStaff:
      data?.data?.filter((staff) => staff.status === "inactive") || [],
    terminatedStaff:
      data?.data?.filter((staff) => staff.status === "terminated") || [],

    // Department breakdown
    staffByDepartment:
      data?.data?.reduce((acc, staff) => {
        if (staff.department) {
          acc[staff.department] = (acc[staff.department] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {},

    // Team assignment summary
    staffWithTeams:
      data?.data?.filter(
        (staff) => staff.currentTeams && staff.currentTeams.length > 0
      ) || [],

    staffWithoutTeams:
      data?.data?.filter(
        (staff) => !staff.currentTeams || staff.currentTeams.length === 0
      ) || [],
  };
}

// Export types for external use
export type { StaffResponse };
