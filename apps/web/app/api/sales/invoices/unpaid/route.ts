// =============================================================================
// SAL Accounting System - Unpaid Invoices API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { query } from '@/server/db';
import { RowDataPacket } from 'mysql2';

interface UnpaidInvoiceRow extends RowDataPacket {
    id: number;
    invoice_no: string;
    invoice_date: Date;
    due_date: Date;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    status: string;
    currency: string;
}

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SALES_PAYMENT_CREATE);

        const searchParams = request.nextUrl.searchParams;
        const customerId = searchParams.get('customerId');

        if (!customerId) {
            return successResponse([]); // Return empty if no customer selected
        }

        const sql = `
            SELECT 
                id, invoice_no, invoice_date, due_date, 
                grand_total as total_amount, paid_amount, 
                (grand_total - paid_amount) as balance_due,
                status, currency
            FROM sales_invoices
            WHERE customer_id = ? 
              AND status IN ('POSTED', 'PARTIALLY_PAID')
              AND (grand_total - paid_amount) > 0
            ORDER BY due_date ASC
        `;

        const rows = await query<UnpaidInvoiceRow[]>(sql, [customerId]);

        const invoices = rows.map(r => ({
            id: r.id,
            invoiceNo: r.invoice_no,
            invoiceDate: r.invoice_date.toISOString(),
            dueDate: r.due_date.toISOString(),
            grandTotal: Number(r.total_amount),
            paidAmount: Number(r.paid_amount),
            balanceDue: Number(r.balance_due),
            status: r.status,
            currency: r.currency,
        }));

        return successResponse(invoices);
    } catch (error) {
        return handleApiError(error);
    }
}
