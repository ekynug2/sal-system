import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { ProfitLossReport } from '@/shared/types';

export const reportKeys = {
    all: ['reports'] as const,
    pnl: (params: { from?: string; to?: string }) => [...reportKeys.all, 'pnl', params] as const,
};

export function usePnLReport(params: { from: string; to: string }) {
    return useQuery({
        queryKey: reportKeys.pnl(params),
        queryFn: () => apiGet<ProfitLossReport>('/reports/pnl', params),
    });
}
