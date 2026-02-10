
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api-client';

export const settingsKeys = {
    all: ['settings'] as const,
};

export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.all,
        queryFn: () => apiGet<Record<string, string>>('/settings'),
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Record<string, string>) => apiPut('/settings', { settings }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: settingsKeys.all });
        },
    });
}
