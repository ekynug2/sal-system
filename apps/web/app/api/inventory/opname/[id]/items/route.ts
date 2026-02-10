import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { updateOpnameItem } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const updateItemsSchema = z.object({
    items: z.array(z.object({
        itemId: z.number(),
        countedQty: z.number(),
        notes: z.string().optional()
    }))
});

/**
 * Updates multiple opname items for the opname session identified by the route `id` using data from the request body.
 *
 * The request body must match the `updateItemsSchema` (an object with an `items` array of `{ itemId, countedQty, notes? }`). The handler validates the body, enforces the required inventory permission, and updates each item.
 *
 * @param params - An object (resolved promise) containing the route `id` string, parsed as the opname session id
 * @returns An HTTP `Response`: `{ success: true }` on successful update, or a standardized error response on failure
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_OPNAME_CREATE); // Or EDIT

        const { id } = await params;
        const sessionId = parseInt(id);

        const body = await request.json();
        const parsed = updateItemsSchema.parse(body);

        // Process sequentially to rely on existing service
        // TODO: Optimize if necessary
        for (const item of parsed.items) {
            await updateOpnameItem(sessionId, item.itemId, item.countedQty, item.notes);
        }

        return successResponse({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}