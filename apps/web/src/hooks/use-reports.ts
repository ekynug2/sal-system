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

export function usePnLReport(params: { from: string; to: string }) {
    return useQuery({
        queryKey: reportKeys.pnl(params),
        queryFn: () => apiGet<ProfitLossReport>('/reports/pnl', params),
    });
}

export function useBalanceSheet(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.balanceSheet(params),
        queryFn: () => apiGet<BalanceSheet>('/reports/balance-sheet', params),
    });
}

export function useTrialBalance(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.trialBalance(params),
        queryFn: () => apiGet<TrialBalance>('/reports/trial-balance', params),
    });
}

export function useSalesReport(params: { from: string; to: string }) {
    return useQuery({
        queryKey: reportKeys.sales(params),
        queryFn: () => apiGet<SalesSummary>('/reports/sales', params),
    });
}

export function useARAging(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.arAging(params),
        queryFn: () => apiGet<ARAgingReport[]>('/reports/ar-aging', params),
    });
}

export function useAPAging(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.apAging(params),
        queryFn: () => apiGet<APAgingReport[]>('/reports/ap-aging', params),
    });
}

export function useInventoryValuation(params: { asOf: string }) {
    return useQuery({
        queryKey: reportKeys.inventory(params),
        queryFn: () => apiGet<InventoryValuationReport>('/reports/inventory', params),
    });
}
