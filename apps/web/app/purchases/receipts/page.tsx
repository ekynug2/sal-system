'use client';

// =============================================================================
// SAL Accounting System - Purchase Receipts Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { usePurchaseReceipts } from '@/hooks/use-purchases';
import { formatDate } from '@/lib/api-client';
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

export default function PurchaseReceiptsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');

    const { data, isLoading, error } = usePurchaseReceipts({ page, limit: 20, status: statusFilter || undefined });

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

    if (!user.permissions.includes(Permissions.PURCHASE_RECEIPT_VIEW)) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Akses Ditolak</h3>
                        <p>Anda tidak memiliki izin untuk melihat penerimaan pembelian.</p>
                    </div>
                </main>
            </div>
        );
    }

    const receipts = data || [];
    // TODO: Re-implement pagination when API client returns meta

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Penerimaan Pembelian</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola penerimaan barang dan jasa
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/purchases/receipts/new')}>
                        <Plus size={18} />
                        Penerimaan Baru
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
                                    pointerEvents: 'none',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Cari berdasarkan nomor penerimaan atau pemasok..."
                                onChange={() => {
                                    // Implement search if hook supports it
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
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Memuat penerimaan...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Gagal memuat penerimaan. Silakan coba lagi.
                        </div>
                    ) : receipts.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>Tidak ada penerimaan ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Buat penerimaan pembelian pertama Anda untuk memulai
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/purchases/receipts/new')}
                            >
                                <Plus size={18} />
                                Penerimaan Baru
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Penerimaan</th>
                                            <th>Tanggal</th>
                                            <th>Pemasok</th>
                                            <th>Referensi</th>
                                            <th>Status</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receipts.map((receipt) => (
                                            <tr key={receipt.id}>
                                                <td>
                                                    <span
                                                        style={{
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {receipt.receiptNo}
                                                    </span>
                                                </td>
                                                <td>{formatDate(receipt.receiptDate)}</td>
                                                <td>{receipt.supplierName}</td>
                                                <td>{receipt.referenceNo || '-'}</td>
                                                <td>
                                                    <span className={`badge ${statusColors[receipt.status] || 'badge-draft'}`}>
                                                        {receipt.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => {
                                                            router.push(`/purchases/receipts/${receipt.id}`)
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
                            {receipts.length > 0 && (
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
                                        Menampilkan {receipts.length} data
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
                                            disabled={receipts.length < 20}
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
