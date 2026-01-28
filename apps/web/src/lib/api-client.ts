'use client';

// =============================================================================
// SAL Accounting System - API Client (fetcher for TanStack Query)
// =============================================================================

import type { ApiResponse } from '@/shared/types';

const API_BASE = '/api';

export class ApiError extends Error {
    constructor(
        public code: string,
        message: string,
        public status: number,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
        throw new ApiError(
            data.error?.code || 'UNKNOWN_ERROR',
            data.error?.message || 'An error occurred',
            response.status,
            data.error?.details
        );
    }

    return data.data as T;
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        });
    }

    const response = await fetch(url.toString());
    return handleResponse<T>(response);
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
}

export async function apiPut<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
    });
    return handleResponse<T>(response);
}

// Utility: Generate idempotency key
export function generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format number
export function formatNumber(num: number, decimals: number = 0): string {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}

// Format date
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    });
}
