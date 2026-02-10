'use client';

// =============================================================================
// SAL Accounting System - Toast Notification Provider
// Using Sonner for beautiful, accessible toast notifications
// =============================================================================

import { Toaster } from 'sonner';

/**
 * Provides a configured Sonner Toaster for application-wide toast notifications.
 *
 * @returns A React element rendering a Toaster positioned top-right with rich colors, a close button, 4000ms duration, and custom toast styles (CSS-variable based background, text color, border, radius, shadow) plus the `toast-item` class.
 */
export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            expand={false}
            richColors
            closeButton
            duration={4000}
            toastOptions={{
                style: {
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                },
                className: 'toast-item',
            }}
        />
    );
}