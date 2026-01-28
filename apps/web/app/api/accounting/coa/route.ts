// =============================================================================
// SAL Accounting System - Chart of Accounts API
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getChartOfAccounts, createAccount } from '@/server/services/coa.service';
import { Permissions } from '@/shared/constants';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.COA_VIEW);

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || undefined;
        const typeCode = searchParams.get('typeCode') || undefined;
        const activeOnly = searchParams.get('activeOnly') !== 'false';
        const flat = searchParams.get('flat') === 'true';

        const accounts = await getChartOfAccounts({
            search,
            typeCode,
            activeOnly,
            flat,
        });

        return successResponse(accounts);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.COA_CREATE);

        const body = await request.json();

        // Basic validation
        if (!body.accountCode || !body.accountName || !body.accountTypeCode) {
            throw new Error('Missing required fields: accountCode, accountName, accountTypeCode');
        }

        const id = await createAccount({
            accountCode: body.accountCode,
            accountName: body.accountName,
            accountTypeCode: body.accountTypeCode,
            parentId: body.parentId,
            isHeader: body.isHeader,
            description: body.description,
        });

        return successResponse({ id }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
