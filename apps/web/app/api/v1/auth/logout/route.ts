// =============================================================================
// SAL Accounting System - Logout API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { createAuditLog } from '@/server/services/audit.service';

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);

        // Clear cookie
        const cookieStore = await cookies();
        cookieStore.delete('auth_token');

        // Audit log
        await createAuditLog({
            actorUserId: user.id,
            action: 'LOGOUT',
            entityType: 'USER',
            entityId: user.id,
        });

        return successResponse({ message: 'Logged out successfully' });
    } catch (error) {
        // Still clear cookie even if error
        const cookieStore = await cookies();
        cookieStore.delete('auth_token');

        return handleApiError(error);
    }
}
