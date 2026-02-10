'use client';

// =============================================================================
// SAL Accounting System - Toast Notification Provider
// Using Sonner for beautiful, accessible toast notifications
// =============================================================================

import { Toaster } from 'sonner';

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
