import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getARAging } from '@/server/services/report.service';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';

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
