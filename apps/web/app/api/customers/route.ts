// =============================================================================
// SAL Accounting System - Customers API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { query, transaction, executeTx } from '@/server/db';
import { RowDataPacket } from 'mysql2';
import { CreateCustomerInput } from '@/shared/schemas';
import { getNextNumber, SequenceKeys } from '@/server/services/sequence.service';

interface CustomerRow extends RowDataPacket {
    id: number;
    customer_code: string;
    name: string;
    email: string | null;
    phone: string | null;
    billing_address: string | null;
    group_id: number | null;
    group_name: string | null;
    terms_days: number;
    credit_limit: number;
    current_balance: number;
    tax_code: string;
    is_active: boolean;
}

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.CUSTOMER_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        let sql = `
            SELECT c.*, cg.name as group_name 
            FROM customers c
            LEFT JOIN customer_groups cg ON cg.id = c.group_id
            WHERE 1=1
        `;
        const params: (string | number)[] = [];

        if (activeOnly) {
            sql += ' AND c.is_active = 1';
        }

        if (search) {
            sql += ' AND (c.customer_code LIKE ? OR c.name LIKE ? OR c.email LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        sql += ' ORDER BY c.name LIMIT 100';

        const rows = await query<CustomerRow[]>(sql, params);

        const customers = rows.map(r => ({
            id: r.id,
            customerCode: r.customer_code,
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            billingAddress: r.billing_address || undefined,
            groupId: r.group_id || undefined,
            groupName: r.group_name || undefined,
            termsDays: r.terms_days,
            creditLimit: Number(r.credit_limit),
            currentBalance: Number(r.current_balance),
            taxCode: r.tax_code,
            isActive: Boolean(r.is_active),
        }));

        return successResponse(customers);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.CUSTOMER_CREATE);

        const body = await request.json();
        const parsed = CreateCustomerInput.parse(body);

        // Check duplicate code if needed, but for now rely on auto-increment or UUID if applicable.
        // But schema says customerCode is required in Type but not in Input? 
        // Let's check schema again. CreateCustomerInput doesn't have customerCode.
        // It must be auto-generated.

        const customerId = await transaction(async (connection) => {
            const customerCode = await getNextNumber(connection, SequenceKeys.CUSTOMER);

            const result = await executeTx(
                connection,
                `INSERT INTO customers (
                    customer_code, name, email, phone, billing_address, shipping_address,
                    group_id, terms_days, credit_limit, tax_code, npwp, notes, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    customerCode,
                    parsed.name,
                    parsed.email || null,
                    parsed.phone || null,
                    parsed.billingAddress || null,
                    parsed.shippingAddress || null,
                    parsed.groupId || null,
                    parsed.termsDays,
                    parsed.creditLimit,
                    parsed.taxCode,
                    parsed.npwp || null,
                    parsed.notes || null
                ]
            );
            return result.insertId;
        });

        return successResponse({ id: customerId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
