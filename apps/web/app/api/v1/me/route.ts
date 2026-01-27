// =============================================================================
// SAL Accounting System - Me API Route (Get Current User)
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        return successResponse(user);
    } catch (error) {
        return handleApiError(error);
    }
}
