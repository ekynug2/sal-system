'use client';

// =============================================================================
// SAL Accounting System - Inventory Hooks (TanStack Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, generateIdempotencyKey } from '@/lib/api-client';
import type { ItemStock, StockLedgerEntry, PaginatedResponse, InventoryAdjustment } from '@/shared/types';

// Query Keys
export const inventoryKeys = {
    all: ['inventory'] as const,
    stockOnHand: (categoryId?: number) => [...inventoryKeys.all, 'stock-on-hand', categoryId] as const,
    ledger: (filters: Record<string, unknown>) => [...inventoryKeys.all, 'ledger', filters] as const,
    adjustments: () => [...inventoryKeys.all, 'adjustments'] as const,
    adjustmentList: (filters: Record<string, unknown>) => [...inventoryKeys.adjustments(), 'list', filters] as const,
    adjustmentDetail: (id: number) => [...inventoryKeys.adjustments(), 'detail', id] as const,
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

export function useInventoryAdjustments(params: {
    page?: number;
    limit?: number;
} = {}) {
    return useQuery({
        queryKey: inventoryKeys.adjustmentList(params),
        queryFn: () => apiGet<PaginatedResponse<InventoryAdjustment>>('/inventory/adjustments', params),
    });
}

export function useInventoryAdjustment(id: number) {
    return useQuery({
        queryKey: inventoryKeys.adjustmentDetail(id),
        queryFn: () => apiGet<InventoryAdjustment>(`/inventory/adjustments/${id}`),
        enabled: !!id,
    });
}

export interface CreateAdjustmentInput {
    adjDate: string;
    adjustmentType: 'MANUAL' | 'OPNAME';
    memo?: string;
    lines: {
        itemId: number;
        qtyDelta: number;
        unitCost?: number;
        reasonCode: string;
        memo?: string;
    }[];
}

export function useCreateAdjustment() { // Renamed from useCreateInventoryAdjustment for brevity
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateAdjustmentInput) => apiPost<{ id: number }>('/inventory/adjustments', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
        },
    });
}

export function usePostAdjustment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiPost(`/inventory/adjustments/${id}/post`, { idempotencyKey: generateIdempotencyKey() }),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustmentDetail(id) });
        },
    });
}
