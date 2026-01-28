// =============================================================================
// SAL Accounting System - Sales Credit Notes API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import {
    getSalesCreditNotes,
    createSalesCreditNote,
    CreateCreditNoteInput
} from '@/server/services/sales.service';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const createCreditNoteSchema = z.object({
    invoiceId: z.number(),
    creditDate: z.string(),
    reasonCode: z.enum(['RETURN', 'PRICE_ADJUSTMENT', 'DAMAGED', 'OTHER']),
    restock: z.boolean(),
    lines: z.array(z.object({
        itemId: z.number(),
        qty: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        taxCode: z.string(),
        memo: z.string().optional(),
    })).min(1),
    memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_CREDIT_NOTE_VIEW);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');

        const result = await getSalesCreditNotes({
            page,
            limit,
            status: status || undefined,
            customerId: customerId ? parseInt(customerId) : undefined,
        });

        return paginatedResponse(result.creditNotes, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_CREDIT_NOTE_CREATE);

        const body = await request.json();
        const parsed = createCreditNoteSchema.parse(body);

        const input: CreateCreditNoteInput = {
            invoiceId: parsed.invoiceId,
            creditDate: parsed.creditDate,
            reasonCode: parsed.reasonCode,
            restock: parsed.restock,
            lines: parsed.lines,
            memo: parsed.memo,
        };

        const creditNoteId = await createSalesCreditNote(input, user.id);

        return successResponse({ id: creditNoteId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
