'use client';

// =============================================================================
// SAL Accounting System - Error Boundary
// Catches and displays runtime errors gracefully
// =============================================================================

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error Boundary caught:', error, errorInfo);
        // TODO: Log to error tracking service (Sentry, etc.)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-6)',
                        background: 'var(--bg-secondary)',
                    }}
                >
                    <div
                        className="card"
                        style={{
                            maxWidth: '500px',
                            textAlign: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--accent-red-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto var(--space-4)',
                            }}
                        >
                            <AlertCircle size={32} color="var(--accent-red)" />
                        </div>

                        <h2 style={{ marginBottom: 'var(--space-3)' }}>Terjadi Kesalahan</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Terjadi kesalahan yang tidak terduga. Silakan coba muat ulang halaman.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details
                                style={{
                                    marginTop: 'var(--space-4)',
                                    padding: 'var(--space-4)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                }}
                            >
                                <summary
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    Detail Error (Hanya mode pengembangan)
                                </summary>
                                <pre
                                    style={{
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        fontFamily: 'var(--font-mono)',
                                    }}
                                >
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                            style={{ marginTop: 'var(--space-6)' }}
                        >
                            <RefreshCw size={18} />
                            Muat Ulang Halaman
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
