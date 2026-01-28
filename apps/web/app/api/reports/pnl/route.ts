import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getProfitLoss } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.REPORT_PNL);

        const searchParams = request.nextUrl.searchParams;
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // Default to current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const startDate = from || startOfMonth;
        const endDate = to || endOfMonth;

        const report = await getProfitLoss({ startDate, endDate });

        return successResponse(report);
    } catch (error) {
        return handleApiError(error);
    }
}
