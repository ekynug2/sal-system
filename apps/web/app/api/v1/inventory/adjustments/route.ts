// =============================================================================
// SAL Accounting System - Inventory Adjustments API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, paginatedResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { createInventoryAdjustment, getInventoryAdjustments, CreateInventoryAdjustmentInput } from '@/server/services/inventory.service';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
    adjDate: z.string(),
    adjustmentType: z.enum(['MANUAL', 'OPNAME']),
    memo: z.string().optional(),
    lines: z.array(z.object({
        itemId: z.number(),
        qtyDelta: z.number(),
        unitCost: z.number().optional(),
        reasonCode: z.string(),
        memo: z.string().optional(),
    })).min(1),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_ADJUSTMENT_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const result = await getInventoryAdjustments({ page, limit });

        return paginatedResponse(result.adjustments, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_ADJUSTMENT_CREATE);

        const body = await request.json();
        const parsed = createAdjustmentSchema.parse(body);

        // Convert types if necessary or pass directly if matches
        const input: CreateInventoryAdjustmentInput = {
            ...parsed,
            lines: parsed.lines.map(l => ({
                ...l,
                // Ensure optional fields are explicitly undefined if missing/null, though Zod handles optional well
            }))
        };

        const id = await createInventoryAdjustment(input, user.id);

        return successResponse({ id }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
