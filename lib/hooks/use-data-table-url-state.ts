'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

// Types for data table state
export interface DataTableFilters {
  search?: string;
  region?: string;
  status?: string;
  [key: string]: string | undefined;
}

export interface DataTableSort {
  column?: string;
  order?: 'asc' | 'desc';
}

export interface DataTablePagination {
  page: number;
  limit: number;
}

export interface DataTableState {
  filters: DataTableFilters;
  sort: DataTableSort;
  pagination: DataTablePagination;
}

// Default values
const DEFAULT_PAGINATION = { page: 1, limit: 10 };
const DEFAULT_SORT = { column: undefined, order: undefined as 'asc' | 'desc' | undefined };
const DEFAULT_FILTERS = {};

interface UseDataTableUrlStateOptions {
  defaultFilters?: DataTableFilters;
  defaultSort?: DataTableSort;
  defaultPagination?: DataTablePagination;
}

interface UseDataTableUrlStateReturn {
  // Current state
  filters: DataTableFilters;
  sort: DataTableSort;
  pagination: DataTablePagination;

  // State update functions
  setFilters: (filters: Partial<DataTableFilters>) => void;
  setSort: (column: string) => void;
  clearSort: () => void;
  setPagination: (pagination: Partial<DataTablePagination>) => void;
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string | null) => void;
  clearFilters: () => void;

  // Utility functions
  hasActiveFilters: boolean;
  updateUrl: (updates: Record<string, string | null>) => void;
}

export function useDataTableUrlState(
  options: UseDataTableUrlStateOptions = {}
): UseDataTableUrlStateReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    defaultFilters = DEFAULT_FILTERS,
    defaultSort = DEFAULT_SORT,
    defaultPagination = DEFAULT_PAGINATION,
  } = options;

  // Parse current URL state
  const currentState = useMemo((): DataTableState => {
    const params = new URLSearchParams(searchParams.toString());

    // Parse filters
    const filters: DataTableFilters = { ...defaultFilters };
    const search = params.get('search');
    const region = params.get('region');
    const status = params.get('status');

    if (search) filters.search = search;
    if (region && region !== 'all') filters.region = region;
    if (status && status !== 'all') filters.status = status;

    // Parse sort
    const sortColumn = params.get('sort');
    const sortOrder = params.get('order') as 'asc' | 'desc' | null;
    const sort: DataTableSort = {
      column: sortColumn || defaultSort.column,
      order: sortOrder || defaultSort.order,
    };

    // Parse pagination
    const page = parseInt(params.get('page') || '1', 10);
    const limit = parseInt(params.get('limit') || defaultPagination.limit.toString(), 10);
    const pagination: DataTablePagination = {
      page: isNaN(page) ? defaultPagination.page : page,
      limit: isNaN(limit) ? defaultPagination.limit : limit,
    };

    return { filters, sort, pagination };
  }, [searchParams, defaultFilters, defaultSort, defaultPagination]);

  // Update URL with new parameters
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Build new URL
    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl);
  }, [router, pathname, searchParams]);

  // Set filters (partial update)
  const setFilters = useCallback((newFilters: Partial<DataTableFilters>) => {
    const updates: Record<string, string | null> = {};

    Object.entries(newFilters).forEach(([key, value]) => {
      updates[key] = value || null;
    });

    // Reset to page 1 when filters change
    updates.page = '1';

    updateUrl(updates);
  }, [updateUrl]);

  // Set individual filter
  const setFilter = useCallback((key: string, value: string | null) => {
    setFilters({ [key]: value || undefined });
  }, [setFilters]);

  // Set search
  const setSearch = useCallback((search: string) => {
    setFilter('search', search);
  }, [setFilter]);

  // Set sort with cycling logic
  const setSort = useCallback((column: string) => {
    const currentSort = currentState.sort;
    let newOrder: 'asc' | 'desc' | null = 'asc';

    // Cycle through: no sort -> asc -> desc -> no sort
    if (currentSort.column === column) {
      if (currentSort.order === 'asc') {
        newOrder = 'desc';
      } else if (currentSort.order === 'desc') {
        newOrder = null; // Clear sort
      }
    }

    const updates: Record<string, string | null> = {};
    if (newOrder === null) {
      updates.sort = null;
      updates.order = null;
    } else {
      updates.sort = column;
      updates.order = newOrder;
    }

    updateUrl(updates);
  }, [currentState.sort, updateUrl]);

  // Clear sort
  const clearSort = useCallback(() => {
    updateUrl({ sort: null, order: null });
  }, [updateUrl]);

  // Set pagination
  const setPagination = useCallback((newPagination: Partial<DataTablePagination>) => {
    const updates: Record<string, string | null> = {};

    if (newPagination.page !== undefined) {
      updates.page = newPagination.page.toString();
    }
    if (newPagination.limit !== undefined) {
      updates.limit = newPagination.limit.toString();
      // Reset to page 1 when limit changes
      if (!newPagination.page) {
        updates.page = '1';
      }
    }

    updateUrl(updates);
  }, [updateUrl]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    // Navigate to base pathname (removes all query params)
    router.replace(pathname);
  }, [router, pathname]);

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      currentState.filters.search ||
      currentState.filters.region ||
      (currentState.filters.status && currentState.filters.status !== 'all')
    );
  }, [currentState.filters]);

  return {
    // Current state
    filters: currentState.filters,
    sort: currentState.sort,
    pagination: currentState.pagination,

    // State update functions
    setFilters,
    setSort,
    clearSort,
    setPagination,
    setSearch,
    setFilter,
    clearFilters,

    // Utility functions
    hasActiveFilters,
    updateUrl,
  };
}