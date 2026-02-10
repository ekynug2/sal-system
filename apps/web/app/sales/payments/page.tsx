'use client';

// =============================================================================
// SAL Accounting System - Sales Payments Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesPayments } from '@/hooks/use-sales';
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

/**
 * Renders the Sales Payments page with search, filters, payments table, and pagination.
 *
 * Enforces authentication (redirects to /login when no user) and verifies the
 * SALES_PAYMENT_VIEW permission (displays an access-denied card when missing).
 * Handles loading, error, and empty states, provides an action to create/receive a payment,
 * and exposes a temporary payment-detail view via alert.
 *
 * @returns The React element for the Sales Payments page.
 */
export default function SalesPaymentsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const { data, isLoading, error } = useSalesPayments({ page, limit: 20, search });

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

    // Basic permission check
    if (!user.permissions.includes(Permissions.SALES_PAYMENT_VIEW)) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Akses Ditolak</h3>
                        <p>Anda tidak memiliki izin untuk melihat pembayaran penjualan.</p>
                    </div>
                </main>
            </div>
        );
    }

    const payments = data || [];
    // TODO: Re-implement pagination when API client returns meta

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Pembayaran Penjualan</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Lihat dan kelola pembayaran yang diterima
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/sales/payments/new')}>
                        <Plus size={18} />
                        Terima Pembayaran
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
                                placeholder="Cari berdasarkan nomor pembayaran, pelanggan, atau referensi..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42 }}
                            />
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
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Memuat pembayaran...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Gagal memuat pembayaran. Silakan coba lagi.
                        </div>
                    ) : payments.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>Tidak ada pembayaran ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Terima pembayaran pertama Anda untuk melihatnya di sini
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/sales/payments/new')}
                            >
                                <Plus size={18} />
                                Terima Pembayaran
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Pembayaran</th>
                                            <th>Tanggal</th>
                                            <th>Pelanggan</th>
                                            <th>Metode</th>
                                            <th>Referensi</th>
                                            <th style={{ textAlign: 'right' }}>Jumlah</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td>
                                                    <span
                                                        style={{
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {payment.paymentNo}
                                                    </span>
                                                </td>
                                                <td>{formatDate(payment.receivedDate)}</td>
                                                <td>{payment.customerName}</td>
                                                <td>
                                                    <span className="badge badge-default">
                                                        {payment.method.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>{payment.referenceNo || '-'}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(payment.amountTotal)}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => {
                                                            // Show payment details in alert for now
                                                            // TODO: Create detail page or modal
                                                            alert(`Detail Pembayaran:\n\nNo. Pembayaran: ${payment.paymentNo}\nPelanggan: ${payment.customerName}\nTanggal: ${formatDate(payment.receivedDate)}\nMetode: ${payment.method}\nJumlah: ${formatCurrency(payment.amountTotal)}\nReferensi: ${payment.referenceNo || '-'}\nMemo: ${payment.memo || '-'}`);
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
                            {payments.length > 0 && (
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
                                        Menampilkan {payments.length} pembayaran
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
                                            disabled={payments.length < 20}
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