// =============================================================================
// SAL Accounting System - Stock Opname Detail API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getStockOpnameSession } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_VIEW);

        const { id } = await params;
        const sessionId = parseInt(id);

        const session = await getStockOpnameSession(sessionId);

        if (!session) {
            return handleApiError(new Error('Session not found'));
        }

        return successResponse(session);
    } catch (error) {
        return handleApiError(error);
    }
}
