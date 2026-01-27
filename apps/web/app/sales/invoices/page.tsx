'use client';

// =============================================================================
// SAL Accounting System - Sales Invoices Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesInvoices, usePostInvoice } from '@/hooks/use-sales';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    Plus,
    Search,
    Filter,
    FileText,
    MoreVertical,
    Send,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';

const statusColors: Record<string, string> = {
    DRAFT: 'badge-draft',
    POSTED: 'badge-posted',
    PARTIALLY_PAID: 'badge-partial',
    PAID: 'badge-paid',
    VOIDED: 'badge-voided',
};

export default function SalesInvoicesPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showActions, setShowActions] = useState<number | null>(null);

    const { data, isLoading, error } = useSalesInvoices({ page, limit: 20, status: statusFilter || undefined });
    const postInvoice = usePostInvoice();

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

    const invoices = data?.data || [];
    const meta = data?.meta;

    async function handlePost(invoiceId: number) {
        if (confirm('Are you sure you want to post this invoice? This action cannot be undone.')) {
            try {
                await postInvoice.mutateAsync(invoiceId);
                alert('Invoice posted successfully!');
            } catch (err) {
                alert(`Failed to post invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
        setShowActions(null);
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Sales Invoices</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Manage customer invoices and track payments
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/sales/invoices/new')}>
                        <Plus size={18} />
                        New Invoice
                    </button>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search by invoice number or customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42 }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: 180 }}
                        >
                            <option value="">All Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="POSTED">Posted</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="PAID">Paid</option>
                            <option value="VOIDED">Voided</option>
                        </select>
                        <button className="btn btn-secondary">
                            <Filter size={18} />
                            More Filters
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Loading invoices...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Failed to load invoices. Please try again.
                        </div>
                    ) : invoices.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>No invoices found</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Create your first invoice to get started
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/sales/invoices/new')}
                            >
                                <Plus size={18} />
                                Create Invoice
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Due Date</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                            <th style={{ textAlign: 'right' }}>Balance</th>
                                            <th>Status</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr key={inv.id}>
                                                <td>
                                                    <button
                                                        onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {inv.invoiceNo}
                                                    </button>
                                                </td>
                                                <td>{formatDate(inv.invoiceDate)}</td>
                                                <td>{inv.customerName}</td>
                                                <td>{formatDate(inv.dueDate)}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(inv.grandTotal)}
                                                </td>
                                                <td
                                                    className="money"
                                                    style={{
                                                        textAlign: 'right',
                                                        color: inv.balanceDue > 0 ? 'var(--accent-red)' : 'inherit',
                                                    }}
                                                >
                                                    {formatCurrency(inv.balanceDue)}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusColors[inv.status] || 'badge-draft'}`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ position: 'relative' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => setShowActions(showActions === inv.id ? null : inv.id)}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {showActions === inv.id && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: '100%',
                                                                background: 'var(--bg-primary)',
                                                                borderRadius: 'var(--radius-md)',
                                                                boxShadow: 'var(--shadow-lg)',
                                                                border: '1px solid var(--border-color)',
                                                                zIndex: 10,
                                                                minWidth: 160,
                                                                padding: 'var(--space-2)',
                                                            }}
                                                        >
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                                                onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                                                            >
                                                                <Eye size={16} />
                                                                View Details
                                                            </button>
                                                            {inv.status === 'DRAFT' && (
                                                                <button
                                                                    className="btn btn-ghost"
                                                                    style={{ width: '100%', justifyContent: 'flex-start' }}
                                                                    onClick={() => handlePost(inv.id)}
                                                                    disabled={postInvoice.isPending}
                                                                >
                                                                    <Send size={16} />
                                                                    Post Invoice
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
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
                                        {meta.total} invoices
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
