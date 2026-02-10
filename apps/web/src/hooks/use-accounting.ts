'use client';

// =============================================================================
// SAL Accounting System - Accounting Hooks
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type { ChartOfAccount, JournalEntry } from '@/shared/types';

// Query Keys
export const accountingKeys = {
    all: ['accounting'] as const,
    coa: (params?: Record<string, unknown>) => [...accountingKeys.all, 'coa', params] as const,
    journals: (params?: Record<string, unknown>) => [...accountingKeys.all, 'journals', params] as const,
};

// -----------------------------------------------------------------------------
// Chart of Accounts Hooks
// -----------------------------------------------------------------------------

export function useChartOfAccounts(params: {
    search?: string;
    typeCode?: string;
    activeOnly?: boolean;
    flat?: boolean;
} = {}) {
    const queryParams = {
        search: params.search,
        typeCode: params.typeCode,
        activeOnly: params.activeOnly?.toString(),
        flat: params.flat?.toString(),
    };

    return useQuery({
        queryKey: accountingKeys.coa(params),
        queryFn: () => apiGet<ChartOfAccount[]>('/accounting/coa', queryParams),
    });
}

export function useCreateAccount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: {
            accountCode: string;
            accountName: string;
            accountTypeCode: string;
            parentId?: number;
            isHeader?: boolean;
            description?: string;
        }) => apiPost<{ id: number }>('/accounting/coa', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountingKeys.coa() });
        },
    });
}

// -----------------------------------------------------------------------------
// Journal Entry Hooks
/**
 * Fetches journal entries using optional date, source-type filters, and pagination.
 *
 * @param params - Optional filters and pagination for the query.
 *   - from: ISO date string for the start of the date range (inclusive).
 *   - to: ISO date string for the end of the date range (inclusive).
 *   - sourceType: Filter by journal source type.
 *   - page: Page number for paginated results.
 *   - limit: Number of items per page.
 * @returns The React Query result containing an array of `JournalEntry` objects matching the provided filters.
 */

export function useJournalEntries(params: {
    from?: string;
    to?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
} = {}) {
    const queryParams = {
        from: params.from,
        to: params.to,
        sourceType: params.sourceType,
        page: params.page,
        limit: params.limit,
    };

    return useQuery({
        queryKey: accountingKeys.journals(params),
        queryFn: () => apiGet<JournalEntry[]>('/accounting/journals', queryParams),
    });
}

export function useCreateJournalEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: {
            entryDate: string;
            memo?: string;
            lines: {
                accountId: number;
                dc: 'D' | 'C';
                amount: number;
                memo?: string;
            }[];
        }) => apiPost<{ id: number }>('/accounting/journals', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountingKeys.journals() });
        },
    });
}