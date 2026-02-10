'use client';

// =============================================================================
// SAL Accounting System - Sales Credit Notes Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesCreditNotes } from '@/hooks/use-sales';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    Plus,
    Search,
    Filter,
    FileText,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { Permissions } from '@/shared/constants';

const statusColors: Record<string, string> = {
    DRAFT: 'badge-draft',
    POSTED: 'badge-posted',
    VOIDED: 'badge-voided',
};

/**
 * Render the Sales Credit Notes page, including authentication checks, permission gating,
 * filters, list table, and client-side pagination controls.
 *
 * Shows a full-page loader while authentication is loading, redirects unauthenticated users
 * to the login page, and displays an access-denied message when the user lacks view permission.
 * When authorized, presents search and status filters, a table of credit notes with formatted
 * dates and amounts, status badges, actions to view details or create a new credit note, and
 * simple Prev/Next pagination based on the fetched page size.
 *
 * @returns The component's JSX element representing the Sales Credit Notes page.
 */
export default function SalesCreditNotesPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');

    const { data, isLoading, error } = useSalesCreditNotes({ page, limit: 20, status: statusFilter || undefined });

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

    if (!user.permissions.includes(Permissions.SALES_CREDIT_NOTE_VIEW)) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Akses Ditolak</h3>
                        <p>Anda tidak memiliki izin untuk melihat nota kredit.</p>
                    </div>
                </main>
            </div>
        );
    }

    const creditNotes = data || [];
    // TODO: Re-implement pagination when API client returns meta

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Nota Kredit Penjualan</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola retur pelanggan dan penyesuaian kredit
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/sales/credit-notes/new')}>
                        <Plus size={18} />
                        Nota Kredit Baru
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
                                placeholder="Cari berdasarkan nomor nota kredit atau pelanggan..."
                                onChange={() => {
                                    // Implement search logic if supported by API/hook
                                }}
                                style={{ paddingLeft: 42 }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: 180 }}
                        >
                            <option value="">Semua Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="POSTED">Diposting</option>
                            <option value="VOIDED">Dibatalkan</option>
                        </select>
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
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Memuat nota kredit...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Gagal memuat nota kredit. Silakan coba lagi.
                        </div>
                    ) : creditNotes.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>Tidak ada nota kredit ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Buat nota kredit pertama Anda untuk memulai
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/sales/credit-notes/new')}
                            >
                                <Plus size={18} />
                                Nota Kredit Baru
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Nota Kredit</th>
                                            <th>Tanggal</th>
                                            <th>Pelanggan</th>
                                            <th>Faktur Asli</th>
                                            <th style={{ textAlign: 'right' }}>Jumlah</th>
                                            <th>Status</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditNotes.map((cn) => (
                                            <tr key={cn.id}>
                                                <td>
                                                    <span
                                                        style={{
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {cn.creditNoteNo}
                                                    </span>
                                                </td>
                                                <td>{formatDate(cn.creditDate)}</td>
                                                <td>{cn.customerName}</td>
                                                <td>{cn.invoiceNo}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(cn.grandTotal)}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusColors[cn.status] || 'badge-draft'}`}>
                                                        {cn.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => {
                                                            router.push(`/sales/credit-notes/${cn.id}`)
                                                        }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination - TODO: Re-implement when API returns meta */}
                            {creditNotes.length > 0 && (
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
                                        Menampilkan {creditNotes.length} data
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
                                            Halaman {page}
                                        </span>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setPage((p) => p + 1)}
                                            disabled={creditNotes.length < 20}
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