// =============================================================================
// SAL Accounting System - Purchase Receipts API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import {
    getPurchaseReceipts,
    createPurchaseReceipt,
    CreatePurchaseReceiptInput
} from '@/server/services/purchase.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const createReceiptSchema = z.object({
    supplierId: z.number(),
    receiptDate: z.string(),
    referenceNo: z.string().optional(),
    memo: z.string().optional(),
    lines: z.array(z.object({
        itemId: z.number(),
        qty: z.number().positive(),
        unitCost: z.number().nonnegative(),
        taxCode: z.string(),
        memo: z.string().optional(),
    })).min(1),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_RECEIPT_VIEW);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const supplierId = searchParams.get('supplierId');
        const search = searchParams.get('search');

        const result = await getPurchaseReceipts({
            page,
            limit,
            status: status || undefined,
            supplierId: supplierId ? parseInt(supplierId) : undefined,
            search: search || undefined,
        });

        return paginatedResponse(result.receipts, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_RECEIPT_CREATE);

        const body = await request.json();
        const parsed = createReceiptSchema.parse(body);

        const input: CreatePurchaseReceiptInput = {
            supplierId: parsed.supplierId,
            receiptDate: parsed.receiptDate,
            referenceNo: parsed.referenceNo,
            memo: parsed.memo,
            lines: parsed.lines,
        };

        const receiptId = await createPurchaseReceipt(input, user.id);

        return successResponse({ id: receiptId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
