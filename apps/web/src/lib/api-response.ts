// =============================================================================
// SAL Accounting System - API Response Helpers
// =============================================================================

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ErrorCodes, HttpStatus } from '@/shared/constants';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export function successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

export function errorResponse(
    code: string,
    message: string,
    status: number = 400,
    details?: unknown
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: { code, message, details },
        },
        { status }
    );
}

export function handleApiError(error: unknown): NextResponse {
    console.error('API Error:', error);

    // Zod validation error
    if (error instanceof ZodError) {
        return errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Validation failed',
            HttpStatus.UNPROCESSABLE_ENTITY,
            (error.issues as Array<{ path: unknown[]; message: string }>).map((e) => ({ path: String(e.path.join('.')), message: e.message }))
        );
    }

    // Known business errors
    if (error instanceof Error) {
        const knownError = error as { code?: string; statusCode?: number; details?: unknown };
        if (knownError.code && knownError.statusCode) {
            return errorResponse(
                knownError.code,
                error.message,
                knownError.statusCode,
                knownError.details
            );
        }
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return errorResponse(ErrorCodes.INTERNAL_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR);
}
