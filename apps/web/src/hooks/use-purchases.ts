'use client';

// =============================================================================
// SAL Accounting System - Purchase Hooks
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, generateIdempotencyKey } from '@/lib/api-client';
import type { PurchaseBill, PurchasePayment, PurchaseReceipt } from '@/shared/types';

// Query Keys
export const purchaseKeys = {
    all: ['purchases'] as const,
    bills: () => [...purchaseKeys.all, 'bills'] as const,
    billList: (params?: Record<string, unknown>) => [...purchaseKeys.bills(), 'list', params] as const,
    billDetail: (id: number) => [...purchaseKeys.bills(), 'detail', id] as const,
};

/**
 * Fetches purchase bills using optional pagination and filter parameters.
 *
 * @param params - Query options and filters
 * @param params.page - Page number for paginated results
 * @param params.limit - Number of items per page
 * @param params.supplierId - Filter by supplier ID
 * @param params.status - Filter by bill status
 * @param params.search - Full-text search term to filter bills
 * @returns An array of `PurchaseBill` objects matching the provided filters
 */
export function usePurchaseBills(params: {
    page?: number;
    limit?: number;
    supplierId?: number;
    status?: string;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: purchaseKeys.billList(params),
        queryFn: () => apiGet<PurchaseBill[]>('/purchases/bills', params),
    });
}

export function usePurchaseBill(id: number) {
    return useQuery({
        queryKey: purchaseKeys.billDetail(id),
        queryFn: () => apiGet<PurchaseBill>(`/purchases/bills/${id}`),
        enabled: !!id,
    });
}

export interface CreateBillInput {
    supplierId: number;
    supplierInvoiceNo?: string;
    billDate: string;
    dueDate: string;
    memo?: string;
    lines: {
        itemId: number;
        description?: string;
        qty: number;
        unitCost: number;
        taxCode: string;
        memo?: string;
    }[];
}

export function useCreatePurchaseBill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateBillInput) => apiPost<{ id: number }>('/purchases/bills', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
        },
    });
}

export function usePostPurchaseBill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => apiPost(`/purchases/bills/${id}/post`, { idempotencyKey: generateIdempotencyKey() }),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
            queryClient.invalidateQueries({ queryKey: purchaseKeys.billDetail(id) });
        },
    });
}

export function useUnpaidBills(supplierId?: number) {
    return useQuery({
        queryKey: [...purchaseKeys.bills(), 'unpaid', supplierId],
        queryFn: () => apiGet<PurchaseBill[]>(`/purchases/bills/unpaid`, { supplierId }),
        enabled: !!supplierId,
    });
}

export interface CreatePaymentInput {
    supplierId: number;
    paymentDate: string;
    method: string;
    amountTotal: number;
    allocations: { billId: number; amount: number }[];
    bankAccountId?: number;
    referenceNo?: string;
    memo?: string;
}

export function useCreatePurchasePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreatePaymentInput) => apiPost<{ id: number }>('/purchases/payments', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: purchaseKeys.bills() });
            // Invalidate supplier balance if we had that query
        },
    });
}

/**
 * Fetches supplier payments using optional pagination and filter parameters.
 *
 * @param params - Optional query parameters to filter and paginate results:
 *   - `page`: page number for pagination
 *   - `limit`: number of items per page
 *   - `supplierId`: filter payments for a specific supplier
 *   - `search`: text search filter
 * @returns The React Query result containing an array of `PurchasePayment` items.
 */
export function usePurchasePayments(params: {
    page?: number;
    limit?: number;
    supplierId?: number;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: [...purchaseKeys.all, 'payments', params],
        queryFn: () => apiGet<PurchasePayment[]>('/purchases/payments', params),
    });
}

/**
 * Fetches purchase receipts using optional pagination and filter parameters.
 *
 * @param params - Query options:
 *   - page: page number to retrieve
 *   - limit: items per page
 *   - supplierId: filter receipts by supplier ID
 *   - status: filter receipts by status
 * @returns An array of PurchaseReceipt objects matching the provided parameters
 */
export function usePurchaseReceipts(params: {
    page?: number;
    limit?: number;
    supplierId?: number;
    status?: string;
} = {}) {
    return useQuery({
        queryKey: [...purchaseKeys.all, 'receipts', params],
        queryFn: () => apiGet<PurchaseReceipt[]>('/purchases/receipts', params),
    });
}
