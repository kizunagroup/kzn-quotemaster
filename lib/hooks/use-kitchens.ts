'use client';

import useSWR from 'swr';
import { useDataTableUrlState } from './use-data-table-url-state';

// TypeScript interfaces for type safety
interface Kitchen {
  id: number;
  kitchenCode: string;
  name: string;
  region: string;
  address?: string;
  managerId?: number; // Normalized manager relationship
  managerName?: string; // For display purposes (from joined data)
  managerEmail?: string; // For display purposes (from joined data)
  teamType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface KitchensResponse {
  data: Kitchen[];
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
    sort: string;
    order: string;
  };
}

// Robust fetcher function with error handling
const fetcher = async (url: string): Promise<KitchensResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    // Handle different HTTP error statuses
    if (response.status === 401) {
      throw new Error('Unauthorized: Please log in to access kitchen data');
    }

    if (response.status === 403) {
      throw new Error('Forbidden: You do not have permission to view kitchen data');
    }

    if (response.status >= 500) {
      throw new Error('Server error: Unable to fetch kitchen data. Please try again later.');
    }

    if (response.status === 400) {
      // Try to get detailed error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid request parameters');
      } catch {
        throw new Error('Invalid request parameters');
      }
    }

    // Generic error for other status codes
    throw new Error(`Failed to fetch kitchens: ${response.status} ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response format from server');
  }
};

// Main SWR hook for kitchen data management with URL state integration
export function useKitchens() {
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
    defaultSort: { column: 'kitchenCode', order: 'asc' }, // FIXED: Default sort by kitchenCode ascending
    defaultPagination: { page: 1, limit: 10 },
  });

  // Build API URL dynamically based on current URL state
  const buildApiUrl = () => {
    const params = new URLSearchParams();

    // Add filters
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.region && filters.region !== 'all') {
      params.set('region', filters.region);
    }
    if (filters.status && filters.status !== 'all') {
      params.set('status', filters.status);
    }

    // Add sorting
    if (sort.column) {
      params.set('sort', sort.column);
    }
    if (sort.order) {
      params.set('order', sort.order);
    }

    // Add pagination
    params.set('page', pagination.page.toString());
    params.set('limit', pagination.limit.toString());

    return `/api/kitchens?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for kitchen data
  const { data, error, isLoading, mutate } = useSWR<KitchensResponse>(
    apiUrl,
    fetcher,
    {
      // Performance optimizations
      revalidateOnFocus: false,      // Don't refetch when window gains focus
      revalidateOnReconnect: true,   // Refetch when connection is restored
      dedupingInterval: 30000,       // Dedupe requests for 30 seconds
      errorRetryCount: 3,            // Retry failed requests 3 times
      errorRetryInterval: 1000,      // Wait 1 second between retries

      // Cache management
      shouldRetryOnError: (error) => {
        // Don't retry on authentication/authorization errors
        if (error?.message?.includes('Unauthorized') ||
            error?.message?.includes('Forbidden')) {
          return false;
        }
        // Retry on network/server errors
        return true;
      },

      // Performance monitoring
      onError: (error) => {
        console.error('Kitchen data fetch error:', error);
      },

      // Success callback for debugging
      onSuccess: (data) => {
        console.log(`Kitchen data loaded: ${data.data.length} kitchens found`);
      }
    }
  );

  // Return structured object with all necessary data and functions
  return {
    // Data
    kitchens: data?.data || [],
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
    hasNextPage: data?.pagination ? data.pagination.page < data.pagination.pages : false,
    hasPrevPage: data?.pagination ? data.pagination.page > 1 : false,

    // Summary data
    totalKitchens: data?.pagination?.total || 0,
    currentPageSize: data?.data?.length || 0,
  };
}

// Export types for external use
export type { Kitchen, KitchensResponse };