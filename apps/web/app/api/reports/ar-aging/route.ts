import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getARAging } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

/**
 * Handle GET requests for the Accounts Receivable aging report.
 *
 * Enforces the REPORT_AR_AGING permission, reads an optional `asOf` query parameter (YYYY-MM-DD) from the request, defaults to today's date when missing, and returns the AR aging report for that date.
 *
 * @param request - Incoming request; may include an `asOf` query parameter in `YYYY-MM-DD` format to specify the report date
 * @returns The API response payload containing the AR aging report data for the requested date
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_AR_AGING);

        const searchParams = request.nextUrl.searchParams;
        const asOf = searchParams.get('asOf');

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const report = await getARAging({
            asOf: asOf || today
        });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}