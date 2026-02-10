import { NextRequest } from 'next/server';
import { successResponse, handleApiError, errorResponse } from '@/lib/api-response';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { getSettings, updateSettings } from '@/server/services/settings.service';
import { SettingsKeys } from '@/shared/constants';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSettingsSchema = z.object({
    settings: z.record(z.string(), z.string()),
});

/**
 * Handle GET requests to fetch the current application settings after authenticating the requester and enforcing view permission.
 *
 * @returns An API response containing the settings as a map of string keys to string values, or an error response if authentication, permission checks, or retrieval fail.
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, 'SETTINGS_VIEW');

        const settings = await getSettings();
        return successResponse(settings);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * Update application settings using the provided key/value map, restricting changes to allowed setting keys.
 *
 * Validates and filters the incoming settings payload, persists any allowed keys, and returns a confirmation on success.
 *
 * @returns `successResponse` containing `{ message: 'Settings updated successfully' }` on success; `errorResponse` with code `'VALIDATION_ERROR'` if no valid settings were provided; otherwise the error response produced by the API error handler.
 */
export async function PUT(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, 'SETTINGS_EDIT');

        const body = await request.json();
        const { settings } = updateSettingsSchema.parse(body);

        // Filter valid keys
        const validKeys = Object.values(SettingsKeys) as string[];
        const filteredSettings: Record<string, string> = {};

        for (const [key, value] of Object.entries(settings)) {
            if (validKeys.includes(key)) {
                filteredSettings[key] = value;
            }
        }

        if (Object.keys(filteredSettings).length === 0) {
            return errorResponse('VALIDATION_ERROR', 'No valid settings provided');
        }

        await updateSettings(filteredSettings);

        return successResponse({ message: 'Settings updated successfully' });
    } catch (error) {
        return handleApiError(error);
    }
}