
import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { submitStockOpname } from '@/server/services/inventory.service';
import { Permissions } from '@/shared/constants';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.INVENTORY_OPNAME_CREATE);

        const { id } = await params;
        const sessionId = parseInt(id);

        await submitStockOpname(sessionId, user.id);

        return successResponse({ success: true, message: 'Stock opname submitted successfully' });
    } catch (error) {
        return handleApiError(error);
    }
}
