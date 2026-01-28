// =============================================================================
// SAL Accounting System - Post Stock Opname API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { postStockOpname } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const postSchema = z.object({
    idempotencyKey: z.string().min(1),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_OPNAME_POST);

        const { id } = await params;
        const sessionId = parseInt(id);

        const body = await request.json();
        const parsed = postSchema.parse(body);

        const adjustmentId = await postStockOpname(sessionId, user.id, parsed.idempotencyKey);

        return successResponse({
            success: true,
            message: 'Stock opname posted successfully',
            adjustmentId: adjustmentId > 0 ? adjustmentId : undefined
        });
    } catch (error) {
        return handleApiError(error);
    }
}
