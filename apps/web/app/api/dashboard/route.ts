// =============================================================================
// SAL Accounting System - Dashboard API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getDashboardData } from '@/server/services/dashboard.service';
import { Permissions } from '@/shared/constants';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.DASHBOARD_VIEW);

        const data = await getDashboardData();

        return successResponse(data);
    } catch (error) {
        return handleApiError(error);
    }
}
