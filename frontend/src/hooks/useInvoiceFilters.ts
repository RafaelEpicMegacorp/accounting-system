import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilterState } from '../components/data-display/AdvancedFilters';
import { invoiceService, InvoiceSearchParams, InvoiceWithRelations } from '../services/invoiceService';
import { warn } from '../utils/logger';

export interface UseInvoiceFiltersOptions {
  initialFilters?: Partial<FilterState>;
  autoApply?: boolean;
  cacheKey?: string;
}

export interface UseInvoiceFiltersReturn {
  // Filter state
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  updateFilter: (field: keyof FilterState, value: any) => void;
  clearFilters: () => void;
  
  // Query state
  invoices: InvoiceWithRelations[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  
  // Pagination
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  
  // Actions
  applyFilters: () => void;
  refetch: () => void;
}

const defaultFilters: FilterState = {
  status: '',
  clientSearch: '',
  amountMin: '',
  amountMax: '',
  dateFrom: null,
  dateTo: null,
  orderType: 'all',
  dueDateStatus: 'all',
};

export const useInvoiceFilters = (
  options: UseInvoiceFiltersOptions = {}
): UseInvoiceFiltersReturn => {
  const {
    initialFilters = {},
    autoApply = true,
    cacheKey = 'invoice-filters'
  } = options;

  // Filter state
  const [filters, setFiltersState] = useState<FilterState>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultFilters,
          ...parsed,
          ...initialFilters,
          // Parse dates
          dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : null,
          dateTo: parsed.dateTo ? new Date(parsed.dateTo) : null,
        };
      } catch (error) {
        warn('Failed to parse saved filters:', error);
      }
    }
    return { ...defaultFilters, ...initialFilters };
  });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(filters);

  // Save filters to localStorage whenever they change
  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
    localStorage.setItem(cacheKey, JSON.stringify(newFilters));
    
    if (autoApply) {
      setAppliedFilters(newFilters);
      setPage(0); // Reset to first page when filters change
    }
  }, [autoApply, cacheKey]);

  // Update single filter field
  const updateFilter = useCallback((field: keyof FilterState, value: any) => {
    setFilters({ ...filters, [field]: value });
  }, [filters, setFilters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters]);

  // Apply filters manually (for non-auto mode)
  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setPage(0);
  }, [filters]);

  // Convert filters to API search params
  const searchParams = useMemo((): InvoiceSearchParams => {
    const params: InvoiceSearchParams = {
      page: page + 1, // API uses 1-based pagination
      limit: pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    // Basic filters
    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }

    // Build search query from multiple fields
    const searchParts: string[] = [];
    if (appliedFilters.clientSearch) {
      searchParts.push(appliedFilters.clientSearch);
    }
    if (searchParts.length > 0) {
      params.search = searchParts.join(' ');
    }

    // Amount range
    if (appliedFilters.amountMin) {
      params.amountMin = parseFloat(appliedFilters.amountMin);
    }
    if (appliedFilters.amountMax) {
      params.amountMax = parseFloat(appliedFilters.amountMax);
    }

    // Date range
    if (appliedFilters.dateFrom) {
      params.dateFrom = appliedFilters.dateFrom.toISOString().split('T')[0];
    }
    if (appliedFilters.dateTo) {
      params.dateTo = appliedFilters.dateTo.toISOString().split('T')[0];
    }

    // Order type filter (custom handling needed)
    if (appliedFilters.orderType !== 'all') {
      if (appliedFilters.orderType === 'manual') {
        params.hasOrder = false;
      } else if (appliedFilters.orderType === 'recurring') {
        params.hasOrder = true;
      }
    }

    // Due date status (custom handling needed)
    if (appliedFilters.dueDateStatus !== 'all') {
      const now = new Date();
      switch (appliedFilters.dueDateStatus) {
        case 'upcoming':
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          params.dueDateFrom = now.toISOString().split('T')[0];
          params.dueDateTo = nextWeek.toISOString().split('T')[0];
          break;
        case 'due':
          params.dueDateFrom = now.toISOString().split('T')[0];
          params.dueDateTo = now.toISOString().split('T')[0];
          break;
        case 'overdue':
          params.dueDateTo = now.toISOString().split('T')[0];
          params.overdue = true;
          break;
      }
    }

    return params;
  }, [appliedFilters, page, pageSize]);

  // React Query for data fetching
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['invoices', searchParams],
    queryFn: () => invoiceService.getInvoices(searchParams),
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  return {
    // Filter state
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    
    // Query state
    invoices: data?.invoices || [],
    loading: isLoading,
    error: error ? (error as any).message || 'Failed to load invoices' : null,
    totalCount: data?.pagination?.totalCount || 0,
    
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    
    // Actions
    applyFilters,
    refetch,
  };
};