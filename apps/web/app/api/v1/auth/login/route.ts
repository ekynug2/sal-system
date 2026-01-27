// =============================================================================
// SAL Accounting System - Auth API Route (Login)
// =============================================================================

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { login } from '@/server/auth';
import { LoginInputSchema } from '@/shared/schemas';
import { successResponse, handleApiError } from '@/lib/api-response';
import { createAuditLog } from '@/server/services/audit.service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const input = LoginInputSchema.parse(body);

        // Attempt login
        const result = await login(input.email, input.password);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('auth_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        // Audit log
        await createAuditLog({
            actorUserId: result.user.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: result.user.id,
            metadata: { email: input.email },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return successResponse(result);
    } catch (error) {
        // Log failed login attempt
        try {
            const body = await request.clone().json().catch(() => ({}));
            if (body.email) {
                await createAuditLog({
                    actorUserId: 0,
                    action: 'LOGIN_FAILED',
                    entityType: 'USER',
                    entityId: 0,
                    metadata: { email: body.email },
                    ipAddress: request.headers.get('x-forwarded-for') || undefined,
                    userAgent: request.headers.get('user-agent') || undefined,
                }).catch(() => { });
            }
        } catch { }

        return handleApiError(error);
    }
}
