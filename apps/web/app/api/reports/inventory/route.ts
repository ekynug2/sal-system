import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getInventoryValuation } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_INVENTORY);

        const searchParams = request.nextUrl.searchParams;
        const asOf = searchParams.get('asOf');

        const now = new Date();
        // Append full time to date to get end of day state if only date provided?
        // Service expects a string that can be compared against datetime (occurred_at).
        // If user provides "YYYY-MM-DD", we should probably use "YYYY-MM-DD 23:59:59"

        const today = now.toISOString().split('T')[0];
        const dateStr = asOf || today;
        const dateTimeStr = `${dateStr} 23:59:59`;

        const report = await getInventoryValuation({
            asOf: dateTimeStr
        });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}
