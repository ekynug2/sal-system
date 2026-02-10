// =============================================================================
// SAL Accounting System - Post Sales Invoice API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { postSalesInvoice } from '@/server/services/sales.service';
import { PostSalesInvoiceInput } from '@/shared/schemas';
import { Permissions, ErrorCodes } from '@/shared/constants';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Handles POST /sales-invoices/:id to post the specified sales invoice.
 *
 * @param request - The incoming HTTP request whose JSON body must conform to `PostSalesInvoiceInput`.
 * @param context - Route parameters providing an `id` string identifying the invoice to post.
 * @returns An API response object: on success contains `{ message: 'Invoice posted successfully' }`, on error contains standardized error information. 
 */
export async function POST(request: NextRequest, context: RouteParams) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_INVOICE_POST);

        const { id } = await context.params;
        const invoiceId = parseInt(id);

        if (isNaN(invoiceId)) {
            return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid invoice ID', 400);
        }

        const body = await request.json();
        const input = PostSalesInvoiceInput.parse(body);

        // Allow posting even if stock is insufficient (negative stock allowed)
        await postSalesInvoice(invoiceId, user.id, input.idempotencyKey, false);

        return successResponse({ message: 'Invoice posted successfully' });
    } catch (error) {
        return handleApiError(error);
    }
}