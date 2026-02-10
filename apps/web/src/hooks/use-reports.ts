import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { ProfitLossReport, BalanceSheet, TrialBalance, SalesSummary, ARAgingReport, APAgingReport, InventoryValuationReport } from '@/shared/types';

export const reportKeys = {
    all: ['reports'] as const,
    pnl: (params: { from?: string; to?: string }) => [...reportKeys.all, 'pnl', params] as const,
    balanceSheet: (params: { asOf: string }) => [...reportKeys.all, 'balanceSheet', params] as const,
    trialBalance: (params: { asOf: string }) => [...reportKeys.all, 'trialBalance', params] as const,
    sales: (params: { from: string; to: string }) => [...reportKeys.all, 'sales', params] as const,
    arAging: (params: { asOf: string }) => [...reportKeys.all, 'arAging', params] as const,
    apAging: (params: { asOf: string }) => [...reportKeys.all, 'apAging', params] as const,
    inventory: (params: { asOf: string }) => [...reportKeys.all, 'inventory', params] as const,
};

/**
 * Fetches the profit and loss (P&L) report for the specified date range.
 *
 * @param params - Query parameters
 * @param params.from - Start date (inclusive) for the report, as an ISO date string (e.g., "2024-01-01")
 * @param params.to - End date (inclusive) for the report, as an ISO date string (e.g., "2024-01-31")
 * @returns The React Query result containing the fetched `ProfitLossReport` and query metadata
 */
export function usePnLReport(params: { from: string; to: string }) {
    return useQuery({
        queryKey: reportKeys.pnl(params),
        queryFn: () => apiGet<ProfitLossReport>('/reports/pnl', params),
    });
}

/**
 * Fetches the balance sheet report for a given date.
 *
 * @param params - Parameters for the request
 * @param params.asOf - Date (ISO string) to retrieve the balance sheet as of
 * @returns The query result containing the fetched BalanceSheet data and query state
 */
export function useBalanceSheet(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.balanceSheet(params),
        queryFn: () => apiGet<BalanceSheet>('/reports/balance-sheet', params),
    });
}

/**
 * Fetches the trial balance report for a given cutoff date.
 *
 * @param params - Request parameters
 * @param params.asOf - Cutoff date (ISO 8601) used to generate the trial balance
 * @returns The React Query result whose `data` property contains the `TrialBalance` when available
 */
export function useTrialBalance(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.trialBalance(params),
        queryFn: () => apiGet<TrialBalance>('/reports/trial-balance', params),
    });
}

/**
 * Fetches the sales summary for a given date range.
 *
 * @param params - Parameters for the sales report
 * @param params.from - Start date of the reporting range
 * @param params.to - End date of the reporting range
 * @returns The query result whose `data` contains the sales summary for the specified date range
 */
export function useSalesReport(params: { from: string; to: string }) {
    return useQuery({
        queryKey: reportKeys.sales(params),
        queryFn: () => apiGet<SalesSummary>('/reports/sales', params),
    });
}

/**
 * Fetches the accounts receivable aging report for a specific cutoff date.
 *
 * @param params.asOf - Cutoff date for the report (ISO 8601 date string)
 * @returns A React Query result containing an array of `ARAgingReport` entries
 */
export function useARAging(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.arAging(params),
        queryFn: () => apiGet<ARAgingReport[]>('/reports/ar-aging', params),
    });
}

/**
 * Fetches the accounts payable (AP) aging report for the specified reference date.
 *
 * @param params - Parameters for the report request
 * @param params.asOf - Reference date (as a string) to calculate aging buckets
 * @returns The React Query result; its `data` field contains an array of `APAgingReport` entries
 */
export function useAPAging(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.apAging(params),
        queryFn: () => apiGet<APAgingReport[]>('/reports/ap-aging', params),
    });
}

/**
 * Fetches the inventory valuation report for the specified date.
 *
 * @param params - Query parameters
 * @param params.asOf - Date string representing the valuation date (e.g., "2026-02-10")
 * @returns The query result object containing the `InventoryValuationReport` data
 */
export function useInventoryValuation(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.inventory(params),
        queryFn: () => apiGet<InventoryValuationReport>('/reports/inventory', params),
    });
}