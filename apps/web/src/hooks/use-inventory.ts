'use client';

// =============================================================================
// SAL Accounting System - Inventory Hooks (TanStack Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, generateIdempotencyKey } from '@/lib/api-client';
import type { ItemStock, StockLedgerEntry, InventoryAdjustment, StockOpnameSession } from '@/shared/types';

// Query Keys
export const inventoryKeys = {
    all: ['inventory'] as const,
    stockOnHand: (categoryId?: number) => [...inventoryKeys.all, 'stock-on-hand', categoryId] as const,
    ledger: (filters: Record<string, unknown>) => [...inventoryKeys.all, 'ledger', filters] as const,
    adjustments: () => [...inventoryKeys.all, 'adjustments'] as const,
    adjustmentList: (filters: Record<string, unknown>) => [...inventoryKeys.adjustments(), 'list', filters] as const,
    adjustmentDetail: (id: number) => [...inventoryKeys.adjustments(), 'detail', id] as const,
    opname: () => [...inventoryKeys.all, 'opname'] as const,
    opnameList: (filters: Record<string, unknown>) => [...inventoryKeys.opname(), 'list', filters] as const,
    opnameDetail: (id: number) => [...inventoryKeys.opname(), 'detail', id] as const,
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
        queryFn: () => apiGet<StockLedgerEntry[]>('/inventory/ledger', params),
    });
}

export function useInventoryAdjustments(params: {
    page?: number;
    limit?: number;
} = {}) {
    return useQuery({
        queryKey: inventoryKeys.adjustmentList(params),
        queryFn: () => apiGet<InventoryAdjustment[]>('/inventory/adjustments', params),
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

export function useStockOpnameSessions(params: {
    page?: number;
    limit?: number;
} = {}) {
    return useQuery({
        queryKey: inventoryKeys.opnameList(params),
        queryFn: () => apiGet<StockOpnameSession[]>('/inventory/opname', params),
    });
}

export function useStockOpnameSession(id: number) {
    return useQuery({
        queryKey: inventoryKeys.opnameDetail(id),
        queryFn: () => apiGet<StockOpnameSession>(`/inventory/opname/${id}`),
        enabled: !!id,
    });
}

export interface CreateOpnameSessionInput {
    opnameDate: string;
    location?: string;
    memo?: string;
    itemIds: number[];
}

export function useCreateStockOpnameSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateOpnameSessionInput) => apiPost<{ id: number }>('/inventory/opname', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opname() });
        },
    });
}

export interface UpdateOpnameItemsInput {
    id: number;
    items: {
        itemId: number;
        countedQty: number;
        notes?: string;
    }[];
}

export function useUpdateOpnameItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateOpnameItemsInput) =>
            apiPut(`/inventory/opname/${input.id}/items`, { items: input.items }),
        onSuccess: (_, input) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opnameDetail(input.id) });
        },
    });
}

export function useSubmitOpnameSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiPost(`/inventory/opname/${id}/submit`, {}),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opnameDetail(id) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opnameList({}) });
        },
    });
}

export function usePostOpnameSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiPost(`/inventory/opname/${id}/post`, { idempotencyKey: generateIdempotencyKey() }),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opnameDetail(id) });
            queryClient.invalidateQueries({ queryKey: inventoryKeys.opnameList({}) });
        },
    });
}
