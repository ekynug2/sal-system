// =============================================================================
// SAL Accounting System - Stock Ledger API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { paginatedResponse, handleApiError } from '@/lib/api-response';
import { getStockLedger } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';
import { PaginationQuery, DateRangeQuery } from '@/shared/schemas';
import { z } from 'zod';

const QuerySchema = PaginationQuery.merge(DateRangeQuery).extend({
    itemId: z.coerce.number().int().positive().optional(),
    sourceType: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const query = QuerySchema.parse({
            page: searchParams.get('page') || 1,
            limit: searchParams.get('limit') || 50,
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
            itemId: searchParams.get('itemId') || undefined,
            sourceType: searchParams.get('sourceType') || undefined,
        });

        const { entries, total } = await getStockLedger(query);

        return paginatedResponse(entries, total, query.page, query.limit);
    } catch (error) {
        return handleApiError(error);
    }
}
