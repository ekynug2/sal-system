'use client';

// =============================================================================
// SAL Accounting System - Master Data Hooks
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { Customer, Item, Supplier } from '@/shared/types';

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
} = { activeOnly: true }) {
    const queryParams = {
        ...params,
        activeOnly: params.activeOnly?.toString(),
    };
    return useQuery({
        queryKey: masterDataKeys.customers(params),
        queryFn: () => apiGet<Customer[]>('/customers', queryParams),
    });
}

export function useSuppliers(params: {
    search?: string;
    activeOnly?: boolean;
} = { activeOnly: true }) {
    const queryParams = {
        ...params,
        activeOnly: params.activeOnly?.toString(),
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
} = { sellableOnly: true }) {
    const queryParams = {
        ...params,
        sellableOnly: params.sellableOnly?.toString(),
        purchasableOnly: params.purchasableOnly?.toString(),
    };
    return useQuery({
        queryKey: masterDataKeys.items(params),
        queryFn: () => apiGet<Item[]>('/items', queryParams),
    });
}
