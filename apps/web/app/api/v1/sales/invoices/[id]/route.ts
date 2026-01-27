// =============================================================================
// SAL Accounting System - Single Sales Invoice API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getSalesInvoice } from '@/server/services/sales.service';
import { Permissions, ErrorCodes } from '@/shared/constants';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_INVOICE_VIEW);

        const { id } = await context.params;
        const invoiceId = parseInt(id);

        if (isNaN(invoiceId)) {
            return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid invoice ID', 400);
        }

        const invoice = await getSalesInvoice(invoiceId);

        if (!invoice) {
            return errorResponse(ErrorCodes.RESOURCE_NOT_FOUND, 'Invoice not found', 404);
        }

        return successResponse(invoice);
    } catch (error) {
        return handleApiError(error);
    }
}
