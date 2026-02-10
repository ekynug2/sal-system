import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getSalesReport } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

/**
 * Handle GET requests to return a sales report for a specified date range.
 *
 * If `from` or `to` query parameters are not provided, the range defaults to the current month's first and last day. Requires an authenticated user with the `REPORT_SALES` permission.
 *
 * @returns The API response containing the sales report data for the requested or default date range.
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_SALES);

        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const startDate = from || startOfMonth;
        const endDate = to || endOfMonth;

        const report = await getSalesReport({ startDate, endDate });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}