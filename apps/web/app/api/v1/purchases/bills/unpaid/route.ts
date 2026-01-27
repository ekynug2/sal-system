import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { getPurchaseBills } from '@/server/services/purchase.service';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.PURCHASE_BILL_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const supplierId = searchParams.get('supplierId') ? parseInt(searchParams.get('supplierId')!) : undefined;

        if (!supplierId) {
            // Must provide supplier ID strictly? Or allow all unpaid.
            // Let's allow all unpaid but usually UI calls with supplierId.
        }

        const result = await getPurchaseBills({
            supplierId,
            status: 'UNPAID', // Uses the logic we just added
            limit: 100 // Reasonable limit for allocations
        });

        // Map to simpler format if needed, but standard bill format is fine
        return successResponse(result.bills);
    } catch (error) {
        return handleApiError(error);
    }
}
