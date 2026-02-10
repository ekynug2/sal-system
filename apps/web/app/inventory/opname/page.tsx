'use client';

// =============================================================================
// SAL Accounting System - Stock Opname Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useStockOpnameSessions } from '@/hooks/use-inventory';
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
    OPEN: 'badge-draft',
    COUNTING: 'badge-partial',
    SUBMITTED: 'badge-posted',
    POSTED: 'badge-paid',
    CANCELLED: 'badge-voided',
};

export default function StockOpnamePage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useStockOpnameSessions({ page, limit: 20 });

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
                        <h3>Akses Ditolak</h3>
                        <p>Anda tidak memiliki izin untuk melihat stok opname.</p>
                    </div>
                </main>
            </div>
        );
    }

    const sessions = data || [];
    // TODO: Re-implement pagination when API client returns meta

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Stok Opname</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola sesi perhitungan fisik persediaan
                        </p>
                    </div>
                    {user.permissions.includes(Permissions.INVENTORY_OPNAME_CREATE) && (
                        <button className="btn btn-primary" onClick={() => router.push('/inventory/opname/new')}>
                            <Plus size={18} />
                            Sesi Baru
                        </button>
                    )}
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
                                placeholder="Cari berdasarkan nomor sesi..."
                                onChange={() => {
                                    // Implement search
                                }}
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
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Memuat sesi...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Gagal memuat sesi stok opname. Silakan coba lagi.
                        </div>
                    ) : sessions.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>Tidak ada sesi ditemukan</h3>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/inventory/opname/new')}
                            >
                                <Plus size={18} />
                                Sesi Baru
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No Sesi</th>
                                            <th>Tanggal</th>
                                            <th>Lokasi</th>
                                            <th>Status</th>
                                            <th>Barang</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.map((session) => (
                                            <tr key={session.id}>
                                                <td>
                                                    <span
                                                        style={{
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {session.sessionNo}
                                                    </span>
                                                </td>
                                                <td>{formatDate(session.opnameDate)}</td>
                                                <td>{session.location || '-'}</td>
                                                <td>
                                                    <span className={`badge ${statusColors[session.status] || 'badge-draft'}`}>
                                                        {session.status}
                                                    </span>
                                                </td>
                                                <td>{session.items?.length || 0} barang</td>
                                                <td>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => {
                                                            router.push(`/inventory/opname/${session.id}`)
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
                            {sessions.length > 0 && (
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
                                        Menampilkan {sessions.length} sesi
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
                                            disabled={sessions.length < 20}
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
