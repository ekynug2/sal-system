// =============================================================================
// SAL Accounting System - Auth Middleware
// =============================================================================

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, findUserById, AuthError } from '@/server/auth';
import { ErrorCodes } from '@/shared/constants';
import type { User } from '@/shared/types';

export interface AuthContext {
    user: User;
    token: string;
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: NextRequest): Promise<AuthContext> {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else {
        // Try cookie
        const cookieStore = await cookies();
        token = cookieStore.get('auth_token')?.value;
    }

    if (!token) {
        throw new AuthError(ErrorCodes.AUTH_UNAUTHORIZED, 'Authentication required');
    }

    // Verify token
    const payload = await verifyToken(token);

    // Get user
    const user = await findUserById(payload.userId);
    if (!user) {
        throw new AuthError(ErrorCodes.AUTH_UNAUTHORIZED, 'User not found');
    }

    if (!user.isActive) {
        throw new AuthError(ErrorCodes.AUTH_USER_INACTIVE, 'User account is inactive', 403);
    }

    return { user, token };
}

/**
 * Check if user has permission
 */
export function requirePermission(user: User, permission: string): void {
    if (!user.permissions.includes(permission)) {
        throw new AuthError(
            ErrorCodes.AUTH_FORBIDDEN,
            `Permission denied: ${permission} required`,
            403
        );
    }
}
