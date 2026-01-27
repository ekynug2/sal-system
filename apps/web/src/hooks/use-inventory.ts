'use client';

// =============================================================================
// SAL Accounting System - Inventory Hooks (TanStack Query)
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { ItemStock, StockLedgerEntry, PaginatedResponse } from '@/shared/types';

// Query Keys
export const inventoryKeys = {
    all: ['inventory'] as const,
    stockOnHand: (categoryId?: number) => [...inventoryKeys.all, 'stock-on-hand', categoryId] as const,
    ledger: (filters: Record<string, unknown>) => [...inventoryKeys.all, 'ledger', filters] as const,
};

// Hooks
export function useStockOnHand(categoryId?: number) {
    return useQuery({
        queryKey: inventoryKeys.stockOnHand(categoryId),
        queryFn: () => apiGet<ItemStock[]>('/inventory/stock-on-hand', { categoryId }),
    });
}

export function useStockLedger(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    itemId?: number;
    sourceType?: string;
} = {}) {
    return useQuery({
        queryKey: inventoryKeys.ledger(params),
        queryFn: () => apiGet<PaginatedResponse<StockLedgerEntry>>('/inventory/ledger', params),
    });
}
