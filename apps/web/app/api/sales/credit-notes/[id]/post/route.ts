// =============================================================================
// SAL Accounting System - Post Sales Credit Note API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { postSalesCreditNote } from '@/server/services/sales.service';
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
        requirePermission(user, Permissions.SALES_CREDIT_NOTE_POST);

        const { id } = await params;
        const creditNoteId = parseInt(id);

        const body = await request.json();
        const parsed = postSchema.parse(body);

        await postSalesCreditNote(creditNoteId, user.id, parsed.idempotencyKey);

        return successResponse({ success: true, message: 'Credit note posted successfully' });
    } catch (error) {
        return handleApiError(error);
    }
}
