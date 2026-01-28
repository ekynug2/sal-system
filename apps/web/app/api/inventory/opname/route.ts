// =============================================================================
// SAL Accounting System - Stock Opname API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import {
    getStockOpnameSessions,
    createStockOpnameSession,
    CreateStockOpnameInput
} from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const createOpnameSchema = z.object({
    opnameDate: z.string(),
    location: z.string().optional(),
    memo: z.string().optional(),
    itemIds: z.array(z.number()).min(1),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_VIEW);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');

        const result = await getStockOpnameSessions({
            page,
            limit,
            status: status || undefined,
        });

        return paginatedResponse(result.sessions, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_OPNAME_CREATE);

        const body = await request.json();
        const parsed = createOpnameSchema.parse(body);

        const input: CreateStockOpnameInput = {
            opnameDate: parsed.opnameDate,
            location: parsed.location,
            memo: parsed.memo,
            itemIds: parsed.itemIds,
        };

        const sessionId = await createStockOpnameSession(input, user.id);

        return successResponse({ id: sessionId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
