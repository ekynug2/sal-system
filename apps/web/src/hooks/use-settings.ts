import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api-client';

export const settingsKeys = {
    all: ['settings'] as const,
};

/**
 * Fetches application settings and exposes their query state.
 *
 * @returns The React Query result object whose `data` property is the settings map (Record<string, string>) when available; also includes status flags (e.g., `isLoading`, `isError`), `error`, and utilities such as `refetch`.
 */
export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.all,
        queryFn: () => apiGet<Record<string, string>>('/settings'),
    });
}

/**
 * Provides a React Query mutation for updating application settings and refreshing the cached settings.
 *
 * @returns A mutation result object whose `mutate`/`mutateAsync` accept a `Record<string, string>` to send as the updated settings; on success the cached settings query (`settingsKeys.all`) is invalidated.
 */
export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Record<string, string>) => apiPut('/settings', { settings }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.all });
        },
    });
}