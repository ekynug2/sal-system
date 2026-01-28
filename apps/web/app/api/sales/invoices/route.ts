// =============================================================================
// SAL Accounting System - Sales Invoices API Routes
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, paginatedResponse, handleApiError } from '@/lib/api-response';
import { getSalesInvoices, createSalesInvoice, CreateSalesInvoiceInput } from '@/server/services/sales.service';
import { CreateSalesInvoiceInput as CreateSalesInvoiceSchema, PaginationQuery, DateRangeQuery } from '@/shared/schemas';
import { Permissions } from '@/shared/constants';
import { z } from 'zod';

const ListQuerySchema = PaginationQuery.merge(DateRangeQuery).extend({
    customerId: z.coerce.number().int().positive().optional(),
    status: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_INVOICE_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const query = ListQuerySchema.parse({
            page: searchParams.get('page') || 1,
            limit: searchParams.get('limit') || 20,
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
            customerId: searchParams.get('customerId') || undefined,
            status: searchParams.get('status') || undefined,
        });

        const { invoices, total } = await getSalesInvoices(query);

        return paginatedResponse(invoices, total, query.page, query.limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_INVOICE_CREATE);

        const body = await request.json();
        const parsed = CreateSalesInvoiceSchema.parse(body);

        // Convert to service input (handle null -> undefined)
        const input: CreateSalesInvoiceInput = {
            customerId: parsed.customerId,
            invoiceDate: parsed.invoiceDate,
            dueDate: parsed.dueDate,
            currency: parsed.currency ?? undefined,
            memo: parsed.memo ?? undefined,
            shippingFee: parsed.shippingFee ?? undefined,
            shippingAddress: parsed.shippingAddress ?? undefined,
            lines: parsed.lines.map(line => ({
                itemId: line.itemId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                discountRate: line.discountRate,
                taxCode: line.taxCode,
                description: line.description ?? undefined,
                memo: line.memo ?? undefined,
            })),
        };

        const invoiceId = await createSalesInvoice(input, user.id);

        return successResponse({ id: invoiceId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
