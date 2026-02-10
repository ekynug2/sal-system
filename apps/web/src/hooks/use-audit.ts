import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { AuditLog, PaginatedResponse } from '@/shared/types';

export interface PaginationParams {
    page?: number;
    limit?: number;
    [key: string]: string | number | undefined;
}

export interface AuditLogParams extends PaginationParams {
    from?: string;
    to?: string;
    entityType?: string;
    action?: string;
}

export const auditKeys = {
    all: ['audit'] as const,
    logs: (params: AuditLogParams) => [...auditKeys.all, 'logs', params] as const,
};

/**
 * Fetches audit logs using the provided filters and pagination options.
 *
 * @param params - Filter and pagination options (e.g., page, limit, from, to, entityType, action)
 * @returns The react-query result containing a paginated list of `AuditLog` entries
 */
export function useAuditLogs(params: AuditLogParams) {
    // Cast to Record<string, string | number | undefined> for apiGet compatibility
    const queryParams = params as Record<string, string | number | undefined>;

    return useQuery({
        queryKey: auditKeys.logs(params),
        queryFn: () => apiGet<PaginatedResponse<AuditLog>>('/settings/logs', queryParams),
    });
}