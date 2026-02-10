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

/**
 * Fetches customer master data using the provided query parameters and returns a React Query result for that request.
 *
 * @param params - Query options for fetching customers. Defaults to `{ activeOnly: true }`.
 *   - `search`: Optional text to filter customers by name or other indexed fields.
 *   - `activeOnly`: When `true`, restricts results to active customers; when omitted no active-only filter is applied.
 *   - `limit`: Maximum number of customers to return.
 * @returns The React Query result containing the fetched array of `Customer` objects.
 */

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

/**
 * Provides a React Query hook to fetch suppliers using optional filters.
 *
 * @param params - Filter and pagination options for the suppliers query
 * @param params.search - Text to search supplier records by name or identifier
 * @param params.activeOnly - When true, restrict results to active suppliers (default: true)
 * @param params.limit - Maximum number of suppliers to return
 * @returns The query result containing the fetched `Supplier[]` and React Query status/metadata
 */
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

/**
 * Provides a React Query hook to fetch item master data with optional filters.
 *
 * @param params - Filter and pagination options for the query. Defaults to `{ sellableOnly: true }`.
 * @param params.search - Text to search item names or codes.
 * @param params.sellableOnly - When true, restricts results to sellable items.
 * @param params.purchasableOnly - When true, restricts results to purchasable items.
 * @param params.limit - Maximum number of items to return.
 * @returns The query result whose `data` is an array of `Item` objects.
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
