
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
