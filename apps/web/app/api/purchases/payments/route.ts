import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { createPurchasePayment, getPurchasePayments, PayBillInput } from '@/server/services/purchase.service';
import { z } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_PAYMENT_VIEW);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const supplierId = searchParams.get('supplierId');
        const search = searchParams.get('search');

        const result = await getPurchasePayments({
            page,
            limit,
            supplierId: supplierId ? parseInt(supplierId) : undefined,
            search: search || undefined,
        });

        return paginatedResponse(result.payments, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

const createPaymentSchema = z.object({
    supplierId: z.number(),
    paymentDate: z.string(),
    method: z.string(),
    amountTotal: z.number().positive(),
    allocations: z.array(z.object({
        billId: z.number(),
        amount: z.number().positive(),
    })).min(1),
    bankAccountId: z.number().optional(),
    referenceNo: z.string().optional(),
    memo: z.string().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_PAYMENT_CREATE);

        const body = await request.json();
        const parsed = createPaymentSchema.parse(body);

        const input: PayBillInput = {
            ...parsed,
        };

        const id = await createPurchasePayment(input, user.id);

        return successResponse({ id }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
