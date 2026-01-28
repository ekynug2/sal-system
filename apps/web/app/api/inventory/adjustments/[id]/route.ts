// =============================================================================
// SAL Accounting System - Inventory Adjustment Detail API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getInventoryAdjustment } from '@/server/services/inventory.service';

interface Props {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params;
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_ADJUSTMENT_VIEW);

        const adjustment = await getInventoryAdjustment(Number(id));

        if (!adjustment) {
            return handleApiError(new Error('Adjustment not found')); // Or 404
        }

        return successResponse(adjustment);
    } catch (error) {
        return handleApiError(error);
    }
}
