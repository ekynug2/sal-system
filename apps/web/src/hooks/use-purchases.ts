'use client';

// =============================================================================
// SAL Accounting System - Purchase Hooks
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, generateIdempotencyKey } from '@/lib/api-client';
import type { PurchaseBill, PaginatedResponse } from '@/shared/types';

// Query Keys
export const purchaseKeys = {
    all: ['purchases'] as const,
    bills: () => [...purchaseKeys.all, 'bills'] as const,
    billList: (params?: Record<string, unknown>) => [...purchaseKeys.bills(), 'list', params] as const,
    billDetail: (id: number) => [...purchaseKeys.bills(), 'detail', id] as const,
};

// Hooks
export function usePurchaseBills(params: {
    page?: number;
    limit?: number;
    supplierId?: number;
    status?: string;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: purchaseKeys.billList(params),
        queryFn: () => apiGet<PaginatedResponse<PurchaseBill>>('/purchases/bills', params),
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

