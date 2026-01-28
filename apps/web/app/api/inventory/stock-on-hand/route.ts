// =============================================================================
// SAL Accounting System - Inventory Stock On Hand API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getStockOnHand } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const QuerySchema = z.object({
    categoryId: z.coerce.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const query = QuerySchema.parse({
            categoryId: searchParams.get('categoryId') || undefined,
        });

        const stock = await getStockOnHand(query.categoryId);

        return successResponse(stock);
    } catch (error) {
        return handleApiError(error);
    }
}
