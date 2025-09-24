"use client";

import useSWR from "swr";
import { useDataTableUrlState } from "./use-data-table-url-state";

// TypeScript interfaces for type safety (updated for generic team management)
interface Team {
  id: number;
  teamCode: string | null; // UPDATED: teamCode instead of kitchenCode
  name: string;
  region: string;
  address?: string;
  managerId?: number;
  managerName?: string;
  managerEmail?: string;
  teamType: string; // NEW: Team type field
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface TeamsResponse {
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
    status: string;
    teamType: string; // NEW: Team type filter
    sort: string;
    order: string;
  };
}

// Robust fetcher function with comprehensive error handling
const fetcher = async (url: string): Promise<TeamsResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    // Handle different HTTP error statuses
    if (response.status === 401) {
      throw new Error("Unauthorized: Please log in to access team data");
    }

    if (response.status === 403) {
      throw new Error(
        "Forbidden: You do not have permission to view team data"
      );
    }

    if (response.status >= 500) {
      throw new Error(
        "Server error: Unable to fetch team data. Please try again later."
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
      `Failed to fetch teams: ${response.status} ${response.statusText}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Invalid response format from server");
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
    updateUrl,
  } = useDataTableUrlState({
    defaultFilters: {},
    defaultSort: { column: "createdAt", order: "desc" }, // UPDATED: Default sort by creation date descending
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

    // NEW: Team type filter support
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

    return `/api/teams?${params.toString()}`; // UPDATED: teams endpoint
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for team data
  const { data, error, isLoading, mutate } = useSWR<TeamsResponse>(
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
        console.error("Team data fetch error:", error);
      },

      // Success callback for debugging
      onSuccess: (data) => {
        console.log(`Team data loaded: ${data.data.length} teams found`);
      },
    }
  );

  // Return structured object with all necessary data and functions
  return {
    // Data
    teams: data?.data || [], // UPDATED: teams instead of kitchens
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
    totalTeams: data?.pagination?.total || 0, // UPDATED: totalTeams instead of totalKitchens
    currentPageSize: data?.data?.length || 0,

    // Team-specific helpers (generalized from kitchen-specific)
    kitchenTeams: data?.data?.filter((team) => team.teamType === "KITCHEN") || [],
    officeTeams: data?.data?.filter((team) => team.teamType === "OFFICE") || [],
    activeTeams: data?.data?.filter((team) => team.status === "active") || [],
    inactiveTeams: data?.data?.filter((team) => team.status === "inactive") || [],

    // Team type breakdown
    teamsByType: data?.data?.reduce((acc, team) => {
      acc[team.teamType] = (acc[team.teamType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},

    // Region breakdown
    teamsByRegion: data?.data?.reduce((acc, team) => {
      if (team.region) {
        acc[team.region] = (acc[team.region] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {},
  };
}

// Export types for external use
export type { Team, TeamsResponse };