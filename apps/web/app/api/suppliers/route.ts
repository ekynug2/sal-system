// =============================================================================
// SAL Accounting System - Suppliers API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { query, transaction, executeTx } from '@/server/db';
import { RowDataPacket } from 'mysql2';
import { CreateSupplierInput } from '@/shared/schemas';
import { getNextNumber, SequenceKeys } from '@/server/services/sequence.service';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SUPPLIER_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');
        const activeOnly = searchParams.get('activeOnly') === 'true';

        let sql = 'SELECT * FROM suppliers WHERE 1=1';
        const params: (string | number)[] = [];

        if (activeOnly) {
            sql += ' AND is_active = 1';
        }

        if (search) {
            sql += ' AND (name LIKE ? OR supplier_code LIKE ? OR email LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        sql += ' ORDER BY name ASC';

        const rows = await query<RowDataPacket[]>(sql, params);

        const suppliers = rows.map(r => ({
            id: r.id,
            supplierCode: r.supplier_code,
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            address: r.address || undefined,
            termsDays: Number(r.terms_days),
            taxCode: r.tax_code,
            npwp: r.npwp || undefined,
            currentBalance: Number(r.current_balance),
            isActive: Boolean(r.is_active),
            notes: r.notes || undefined,
        }));

        return successResponse(suppliers);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.SUPPLIER_CREATE);

        const body = await request.json();
        const parsed = CreateSupplierInput.parse(body);

        const supplierId = await transaction(async (connection) => {
            const supplierCode = await getNextNumber(connection, SequenceKeys.SUPPLIER);

            const result = await executeTx(
                connection,
                `INSERT INTO suppliers (
                    supplier_code, name, email, phone, address,
                    terms_days, tax_code, npwp, notes, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                    supplierCode,
                    parsed.name,
                    parsed.email || null,
                    parsed.phone || null,
                    parsed.address || null,
                    parsed.termsDays,
                    parsed.taxCode,
                    parsed.npwp || null,
                    parsed.notes || null
                ]
            );
            return result.insertId;
        });

        return successResponse({ id: supplierId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
