// =============================================================================
// SAL Accounting System - Sales Payments API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import { receivePayment, getSalesPayments, ReceivePaymentInput } from '@/server/services/sales.service';
import { ReceivePaymentInput as ReceivePaymentSchema } from '@/shared/schemas';
import { Permissions } from '@/shared/constants';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_PAYMENT_VIEW);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const customerId = searchParams.get('customerId');
        const search = searchParams.get('search');

        const result = await getSalesPayments({
            page,
            limit,
            customerId: customerId ? parseInt(customerId) : undefined,
            search: search || undefined,
        });

        return paginatedResponse(result.payments, result.total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_PAYMENT_CREATE);

        const body = await request.json();
        const parsed = ReceivePaymentSchema.parse(body);

        // Convert null to undefined
        const input: ReceivePaymentInput = {
            customerId: parsed.customerId,
            receivedDate: parsed.receivedDate,
            method: parsed.method,
            amountTotal: parsed.amountTotal,
            allocations: parsed.allocations,
            bankAccountId: parsed.bankAccountId ?? undefined,
            referenceNo: parsed.referenceNo ?? undefined,
            memo: parsed.memo ?? undefined,
        };

        const paymentId = await receivePayment(input, user.id);

        return successResponse({ id: paymentId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
