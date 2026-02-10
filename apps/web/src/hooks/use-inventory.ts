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

/**
 * Fetches inventory ledger entries with optional filters and pagination.
 *
 * @param params - Query filters and pagination options
 * @param params.page - Page number for paginated results
 * @param params.limit - Number of items per page
 * @param params.from - Start date (inclusive) filter in ISO format
 * @param params.to - End date (inclusive) filter in ISO format
 * @param params.itemId - Filter by specific item ID
 * @param params.sourceType - Filter by source type string
 * @returns The query result whose `data` is an array of `StockLedgerEntry` matching the provided filters
 */
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

/**
 * Fetches a list of inventory adjustments with optional pagination.
 *
 * @param params - Pagination options for the request
 * @param params.page - Page number to retrieve (1-based)
 * @param params.limit - Number of items per page
 * @returns An array of InventoryAdjustment objects
 */
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

/**
 * Provides a React Query that fetches stock opname (inventory count) sessions.
 *
 * @param params - Optional pagination parameters.
 * @param params.page - Page number to fetch.
 * @param params.limit - Number of items per page.
 * @returns The query result whose `data` is an array of `StockOpnameSession` objects.
 */
export function useStockOpnameSessions(params: {
    page?: number;
    limit?: number;
} = {}) {
    return useQuery({
        queryKey: inventoryKeys.opnameList(params),
        queryFn: () => apiGet<StockOpnameSession[]>('/inventory/opname', params),
    });
}

/**
 * Fetches a single stock opname session by ID.
 *
 * The query is enabled only when `id` is truthy.
 *
 * @param id - The opname session's identifier
 * @returns The query result containing the fetched StockOpnameSession when available
 */
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

/**
 * Provides a mutation hook to create a stock opname (inventory count) session.
 *
 * @returns A React Query mutation object that, when executed with a `CreateOpnameSessionInput`, posts a new opname session and invalidates the opname list cache on success.
 */
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

/**
 * Creates a mutation hook to update the counted items of a stock opname session.
 *
 * The mutation sends the provided items to the opname items endpoint and, on success,
 * invalidates the opname detail cache for the session so fresh data is refetched.
 *
 * @returns A React Query mutation object for updating opname items. The mutation expects an `UpdateOpnameItemsInput` object with `id` and `items`.
 */
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

/**
 * Creates a mutation hook to submit a stock opname session by ID.
 *
 * @returns The mutation object. When executed with an `id`, it submits that opname session and invalidates the opname detail and opname list caches.
 */
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

/**
 * Creates a mutation that posts (finalizes) a stock opname session and refreshes related opname caches on success.
 *
 * @returns A mutation object which, when executed with an opname session `id`, posts that session and invalidates the opname detail and opname list query caches on success.
 */
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