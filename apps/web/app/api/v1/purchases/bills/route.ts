// =============================================================================
// SAL Accounting System - Purchase Bills API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, paginatedResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { createPurchaseBill, getPurchaseBills, CreatePurchaseBillInput } from '@/server/services/purchase.service';
import { z } from 'zod';

const createBillSchema = z.object({
    supplierId: z.number(),
    supplierInvoiceNo: z.string().optional(),
    billDate: z.string(),
    dueDate: z.string(),
    memo: z.string().optional(),
    lines: z.array(z.object({
        itemId: z.number(),
        description: z.string().optional(),
        qty: z.number().min(0.0001),
        unitCost: z.number().min(0),
        taxCode: z.string(),
        memo: z.string().optional(),
    })).min(1),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_BILL_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const supplierId = searchParams.get('supplierId') ? parseInt(searchParams.get('supplierId')!) : undefined;
        const status = searchParams.get('status') || undefined;
        const search = searchParams.get('search') || undefined;

        const result = await getPurchaseBills({ page, limit, supplierId, status, search });

        return paginatedResponse(result.bills, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_BILL_CREATE);

        const body = await request.json();
        const parsed = createBillSchema.parse(body);

        const input: CreatePurchaseBillInput = {
            ...parsed,
            lines: parsed.lines.map(l => ({
                ...l,
            }))
        };

        const id = await createPurchaseBill(input, user.id);

        return successResponse({ id }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
