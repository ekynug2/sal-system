'use client';

// =============================================================================
// SAL Accounting System - Confirmation Dialog Component
// Accessible confirmation modal using Radix UI
// =============================================================================

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    variant = 'danger',
    isLoading = false,
}: ConfirmDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
        onOpenChange(false);
    };

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="modal-overlay" />
                <AlertDialog.Content
                    className="modal-content"
                    style={{
                        maxWidth: '450px',
                        padding: 0,
                    }}
                >
                    <div style={{ padding: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 'var(--radius-lg)',
                                    background:
                                        variant === 'danger'
                                            ? 'var(--accent-red-light)'
                                            : variant === 'warning'
                                                ? 'var(--accent-yellow-light)'
                                                : 'var(--primary-100)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <AlertTriangle
                                    size={24}
                                    color={
                                        variant === 'danger'
                                            ? 'var(--accent-red)'
                                            : variant === 'warning'
                                                ? 'var(--accent-yellow)'
                                                : 'var(--primary-500)'
                                    }
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <AlertDialog.Title
                                    style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 600,
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    {title}
                                </AlertDialog.Title>
                                <AlertDialog.Description
                                    style={{
                                        fontSize: '0.875rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {description}
                                </AlertDialog.Description>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-6)',
                            borderTop: '1px solid var(--border-color)',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <AlertDialog.Cancel asChild>
                            <button className="btn btn-secondary" disabled={isLoading}>
                                {cancelLabel}
                            </button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <button
                                className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm();
                                }}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
