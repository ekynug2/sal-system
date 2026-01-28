'use client';

// =============================================================================
// SAL Accounting System - Stock Ledger Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useStockLedger } from '@/hooks/use-inventory';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    Filter,
    FileText,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { Permissions } from '@/shared/constants';

export default function StockLedgerPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);

    // Additional filters like itemId or date range could be added
    const [itemId, _setItemId] = useState<number | undefined>(undefined);

    const { data, isLoading, error } = useStockLedger({ page, limit: 20, itemId });

    if (authLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    if (!user.permissions.includes(Permissions.INVENTORY_VIEW)) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Permission Denied</h3>
                        <p>You do not have permission to view inventory ledger.</p>
                    </div>
                </main>
            </div>
        );
    }

    const ledger = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Stock Ledger</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            View history of stock movements
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        {/* Placeholder for Item Select or Search */}
                        <div style={{ flex: 1, minWidth: 280, color: 'var(--text-secondary)' }}>
                            Use filter to select specific item (Implementation pending)
                        </div>
                        <button className="btn btn-secondary">
                            <Filter size={18} />
                            Filter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Loading ledger...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Failed to load ledger. Please try again.
                        </div>
                    ) : ledger.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>No records found</h3>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Item</th>
                                            <th>Source</th>
                                            <th style={{ textAlign: 'right' }}>Qty Change</th>
                                            <th style={{ textAlign: 'right' }}>Cost</th>
                                            <th style={{ textAlign: 'right' }}>Value Change</th>
                                            <th style={{ textAlign: 'right' }}>Balance Qty</th>
                                            <th style={{ textAlign: 'right' }}>Balance Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.map((entry) => (
                                            <tr key={entry.id}>
                                                <td>{formatDate(entry.occurredAt)}</td>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{entry.itemSku}</div>
                                                    <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>{entry.itemName}</div>
                                                </td>
                                                <td>
                                                    {entry.sourceType} #{entry.sourceId}
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', color: entry.qtyDelta < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                                    {entry.qtyDelta > 0 ? '+' : ''}{entry.qtyDelta}
                                                </td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(entry.unitCost)}
                                                </td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(entry.valueDelta)}
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {entry.balanceQty}
                                                </td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(entry.balanceValue)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {meta && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-4)',
                                        borderTop: '1px solid var(--border-color)',
                                    }}
                                >
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Showing {(page - 1) * meta.limit + 1} - {Math.min(page * meta.limit, meta.total)} of{' '}
                                        {meta.total} records
                                    </span>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0 var(--space-4)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {page} / {meta.totalPages}
                                        </span>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                            disabled={page >= meta.totalPages}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
