'use client';

import useSWR from 'swr';
import { useDataTableUrlState } from './use-data-table-url-state';

// Task 4.2: TypeScript interfaces matching the API response structure
export interface Supplier {
  id: number;
  supplierCode: string | null;
  name: string;
  taxId: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SuppliersResponse {
  data: Supplier[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
  };
}

// Task 4.3: Robust fetcher function with comprehensive error handling
const fetchSuppliers = async (url: string): Promise<SuppliersResponse> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session management
  });

  if (!response.ok) {
    // Handle different HTTP error statuses
    if (response.status === 401) {
      throw new Error('Không có quyền truy cập. Vui lòng đăng nhập lại.');
    }

    if (response.status === 403) {
      throw new Error('Bạn không có quyền xem danh sách nhà cung cấp.');
    }

    if (response.status >= 500) {
      throw new Error('Lỗi máy chủ. Không thể tải danh sách nhà cung cấp. Vui lòng thử lại sau.');
    }

    if (response.status === 400) {
      // Try to get detailed error message from response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Tham số yêu cầu không hợp lệ');
      } catch {
        throw new Error('Tham số yêu cầu không hợp lệ');
      }
    }

    // Generic error for other status codes
    throw new Error(
      `Không thể tải danh sách nhà cung cấp: ${response.status} ${response.statusText}`
    );
  }

  try {
    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Định dạng dữ liệu phản hồi không hợp lệ');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('định dạng')) {
      throw error;
    }
    throw new Error('Định dạng dữ liệu phản hồi không hợp lệ từ máy chủ');
  }
};

// Task 4.4: Main SWR hook for supplier data management with URL state integration
export function useSuppliers() {
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
    defaultSort: { column: 'createdAt', order: 'desc' }, // UPDATED: Default sort by creation date descending
    defaultPagination: { page: 1, limit: 10 },
  });

  // Build API URL dynamically based on current URL state
  const buildApiUrl = () => {
    const params = new URLSearchParams();

    // Add filters
    if (filters.search) {
      params.set('search', filters.search);
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

    return `/api/suppliers?${params.toString()}`;
  };

  const apiUrl = buildApiUrl();

  // Configure SWR with optimized settings for supplier data
  const { data, error, isLoading, mutate } = useSWR<SuppliersResponse>(
    apiUrl,
    fetchSuppliers,
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
          error?.message?.includes('quyền truy cập') ||
          error?.message?.includes('quyền xem') ||
          error?.message?.includes('Unauthorized') ||
          error?.message?.includes('Forbidden')
        ) {
          return false;
        }
        // Retry on network/server errors
        return true;
      },

      // Performance monitoring
      onError: (error) => {
        console.error('Supplier data fetch error:', error.message);
      },

      // Success callback for debugging (development only)
      onSuccess: (data) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Supplier data loaded: ${data.data.length} suppliers found`);
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
    suppliers: data?.data || [],
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
    totalSuppliers: data?.pagination?.total || 0,
    currentPageSize: data?.data?.length || 0,
    totalPages: data?.pagination?.pages || 0,

    // Supplier-specific helpers
    activeSuppliers: data?.data?.filter((supplier) => supplier.status === 'active') || [],
    inactiveSuppliers:
      data?.data?.filter((supplier) => supplier.status === 'inactive') || [],
  };
}