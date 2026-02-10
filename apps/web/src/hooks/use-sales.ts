'use client';

// =============================================================================
// SAL Accounting System - Sales Hooks (TanStack Query)
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, generateIdempotencyKey } from '@/lib/api-client';
import type { SalesInvoice, SalesPayment, SalesCreditNote } from '@/shared/types';

// Query Keys
export const salesKeys = {
    all: ['sales'] as const,
    invoices: () => [...salesKeys.all, 'invoices'] as const,
    invoiceList: (filters: Record<string, unknown>) => [...salesKeys.invoices(), 'list', filters] as const,
    invoiceDetail: (id: number) => [...salesKeys.invoices(), 'detail', id] as const,
    payments: () => [...salesKeys.all, 'payments'] as const,
    paymentList: (filters: Record<string, unknown>) => [...salesKeys.payments(), 'list', filters] as const,
};

// Hooks
export function useSalesInvoices(params: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    customerId?: number;
    status?: string;
} = {}) {
    return useQuery({
        queryKey: salesKeys.invoiceList(params),
        queryFn: () => apiGet<SalesInvoice[]>('/sales/invoices', params),
    });
}

export function useSalesInvoice(id: number) {
    return useQuery({
        queryKey: salesKeys.invoiceDetail(id),
        queryFn: () => apiGet<SalesInvoice>(`/sales/invoices/${id}`),
        enabled: !!id,
    });
}

export function useUnpaidInvoices(customerId: number | null) {
    return useQuery({
        queryKey: [...salesKeys.invoices(), 'unpaid', customerId],
        queryFn: () => apiGet<SalesInvoice[]>(`/sales/invoices/unpaid`, { customerId: customerId ?? undefined }),
        enabled: !!customerId,
    });
}

interface CreateInvoiceInput {
    customerId: number;
    invoiceDate: string;
    dueDate: string;
    lines: {
        itemId: number;
        qty: number;
        unitPrice: number;
        discountRate: number;
        taxCode: string;
        description?: string;
    }[];
    memo?: string;
    shippingFee?: number;
    shippingAddress?: string;
}

export function useCreateInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateInvoiceInput) => apiPost<{ id: number }>('/sales/invoices', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
        },
    });
}

export function usePostInvoice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (invoiceId: number) =>
            apiPost(`/sales/invoices/${invoiceId}/post`, {
                idempotencyKey: generateIdempotencyKey(),
            }),
        onSuccess: (_, invoiceId) => {
            queryClient.invalidateQueries({ queryKey: salesKeys.invoices() });
            queryClient.invalidateQueries({ queryKey: salesKeys.invoiceDetail(invoiceId) });
        },
    });
}

interface ReceivePaymentInput {
    customerId: number;
    receivedDate: string;
    method: string;
    amountTotal: number;
    allocations: { invoiceId: number; amount: number }[];
    bankAccountId?: number;
    referenceNo?: string;
    memo?: string;
}

export function useReceivePayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: ReceivePaymentInput) => apiPost<{ id: number }>('/sales/payments', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: salesKeys.all });
        },
    });
}

export function useSalesPayments(params: {
    page?: number;
    limit?: number;
    customerId?: number;
    search?: string;
} = {}) {
    return useQuery({
        queryKey: salesKeys.paymentList(params),
        queryFn: () => apiGet<SalesPayment[]>('/sales/payments', params),
    });
}

export function useSalesCreditNotes(params: {
    page?: number;
    limit?: number;
    customerId?: number;
    status?: string;
} = {}) {
    return useQuery({
        queryKey: [...salesKeys.all, 'credit-notes', params],
        queryFn: () => apiGet<SalesCreditNote[]>('/sales/credit-notes', params),
    });
}
