// =============================================================================
// SAL Accounting System - Post Inventory Adjustment API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { postInventoryAdjustment } from '@/server/services/inventory.service';
import { z } from 'zod';

const postSchema = z.object({
    idempotencyKey: z.string().optional(),
});

interface Props {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params;
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_ADJUSTMENT_POST);

        const body = await request.json();
        postSchema.parse(body);

        await postInventoryAdjustment(Number(id), user.id);

        return successResponse({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
