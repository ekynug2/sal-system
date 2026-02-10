'use client';

// =============================================================================
// SAL Accounting System - Master Data Hooks
// =============================================================================

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type { Customer, Item, Supplier } from '@/shared/types';
import type { CreateCustomerInput, CreateSupplierInput, CreateItemInput } from '@/shared/schemas';

// Query Keys
export const masterDataKeys = {
    all: ['master-data'] as const,
    customers: (params?: Record<string, unknown>) => [...masterDataKeys.all, 'customers', params] as const,
    suppliers: (params?: Record<string, unknown>) => [...masterDataKeys.all, 'suppliers', params] as const,
    items: (params?: Record<string, unknown>) => [...masterDataKeys.all, 'items', params] as const,
};

// Hooks

export function useCustomers(params: {
    search?: string;
    activeOnly?: boolean;
    limit?: number;
} = { activeOnly: true }) {
    const queryParams = {
        ...params,
        activeOnly: params.activeOnly?.toString(),
        limit: params.limit,
    };
    return useQuery({
        queryKey: masterDataKeys.customers(params),
        queryFn: () => apiGet<Customer[]>('/customers', queryParams),
    });
}

export function useSuppliers(params: {
    search?: string;
    activeOnly?: boolean;
    limit?: number;
} = { activeOnly: true }) {
    const queryParams = {
        ...params,
        activeOnly: params.activeOnly?.toString(),
        limit: params.limit,
    };
    return useQuery({
        queryKey: masterDataKeys.suppliers(params),
        queryFn: () => apiGet<Supplier[]>('/suppliers', queryParams),
    });
}

export function useItems(params: {
    search?: string;
    sellableOnly?: boolean;
    purchasableOnly?: boolean;
    limit?: number;
} = { sellableOnly: true }) {
    const queryParams = {
        ...params,
        sellableOnly: params.sellableOnly?.toString(),
        purchasableOnly: params.purchasableOnly?.toString(),
        limit: params.limit,
    };
    return useQuery({
        queryKey: masterDataKeys.items(params),
        queryFn: () => apiGet<Item[]>('/items', queryParams),
    });
}

export function useCreateCustomer() {
    return useMutation({
        mutationFn: (data: CreateCustomerInput) => apiPost('/customers', data),
    });
}

export function useCreateSupplier() {
    return useMutation({
        mutationFn: (data: CreateSupplierInput) => apiPost('/suppliers', data),
    });
}

export function useCreateItem() {
    return useMutation({
        mutationFn: (data: CreateItemInput) => apiPost('/items', data),
    });
}

