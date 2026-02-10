import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getTrialBalance } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

/**
 * Handle GET requests for the trial balance report, enforcing authentication and the REPORT_TRIAL_BALANCE permission.
 *
 * @param request - The incoming Next.js request; may include an optional `asOf` query parameter (`YYYY-MM-DD`) to specify the report date. If omitted, today's date is used.
 * @returns An API response containing the trial balance report object on success, or an error response produced by the API error handler.
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_TRIAL_BALANCE);

        const searchParams = request.nextUrl.searchParams;
        const asOf = searchParams.get('asOf');

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const report = await getTrialBalance({
            asOf: asOf || today
        });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}