// =============================================================================
// SAL Accounting System - Purchase Bill Detail API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getPurchaseBill } from '@/server/services/purchase.service';

interface Props {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params;
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_BILL_VIEW);

        const bill = await getPurchaseBill(Number(id));

        if (!bill) {
            return handleApiError(new Error('Bill not found'));
        }

        return successResponse(bill);
    } catch (error) {
        return handleApiError(error);
    }
}
