import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getAPAging } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

/**
 * Handle GET requests to produce the APA aging report for a given date.
 *
 * Requires the authenticated user to have the `REPORT_AP_AGING` permission.
 *
 * @param request - Incoming NextRequest; may include an `asOf` query parameter (`yyyy-mm-dd`). If `asOf` is missing, today's date is used.
 * @returns A standardized success response containing the APA aging report for the requested date, or an API error response on failure.
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_AP_AGING);

        const searchParams = request.nextUrl.searchParams;
        const asOf = searchParams.get('asOf');

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const report = await getAPAging({
            asOf: asOf || today
        });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}