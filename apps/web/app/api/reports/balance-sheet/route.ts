import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getBalanceSheet } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

/**
 * Handle GET requests for the balance sheet report by authenticating the caller, enforcing the REPORT_BALANCE_SHEET permission, and returning the report for the requested date.
 *
 * @param request - The incoming Next.js request; may include an optional `asOf` query parameter in `YYYY-MM-DD` format
 * @returns A standardized API response containing the balance sheet data for the specified `asOf` date (defaults to today's date)
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_BALANCE_SHEET);

        const searchParams = request.nextUrl.searchParams;
        const asOf = searchParams.get('asOf');

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const report = await getBalanceSheet({
            asOf: asOf || today
        });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}