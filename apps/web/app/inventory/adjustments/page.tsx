'use client';

// =============================================================================
// SAL Accounting System - Inventory Adjustments List Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useInventoryAdjustments } from '@/hooks/use-inventory';
import { formatDate } from '@/lib/api-client';
import {
    Plus,
    Loader2,
    FileText,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

/**
 * Render the Inventory Adjustments page, guarding access by authentication and presenting loading,
 * empty, and populated list states with navigation and pagination controls.
 *
 * @returns A React element representing the inventory adjustments list page, including header actions, table rows for adjustments, empty/loading states, and simple pagination controls.
 */
export default function InventoryAdjustmentsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);

    const { data: adjustmentsData, isLoading } = useInventoryAdjustments({
        page,
        limit: 20,
    });

    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }

    const adjustments = adjustmentsData || [];
    // TODO: Re-implement pagination when API client returns meta

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Penyesuaian Persediaan</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola penyesuaian stok dan stok opname
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => router.push('/inventory/adjustments/new')}
                    >
                        <Plus size={18} />
                        Penyesuaian Baru
                    </button>
                </div>

                {/* Filters (Placeholder) */}
                {/* <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                    ... filters ...
                </div> */}

                {/* List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-500)' }} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>Memuat penyesuaian...</p>
                        </div>
                    ) : adjustments.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ margin: '0 auto', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Penyesuaian Ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: 'var(--space-2) auto' }}>
                                Mulailah dengan membuat penyesuaian persediaan baru untuk mengoreksi level stok secara manual atau dari hasil stok opname.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/inventory/adjustments/new')}
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                <Plus size={18} />
                                Buat Penyesuaian Baru
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No Penyesuaian</th>
                                            <th>Tanggal</th>
                                            <th>Tipe</th>
                                            <th>Status</th>
                                            <th>Memo</th>
                                            <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adjustments.map((adj) => (
                                            <tr
                                                key={adj.id}
                                                onClick={() => router.push(`/inventory/adjustments/${adj.id}`)}
                                                style={{ cursor: 'pointer' }}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <td style={{ fontWeight: 500 }}>{adj.adjustmentNo}</td>
                                                <td>{formatDate(adj.adjDate)}</td>
                                                <td>
                                                    <span className={`badge ${adj.adjustmentType === 'OPNAME' ? 'badge-blue' : 'badge-gray'}`}>
                                                        {adj.adjustmentType}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${adj.status === 'POSTED' ? 'badge-green' :
                                                        adj.status === 'DRAFT' ? 'badge-gray' : 'badge-red'
                                                        }`}>
                                                        {adj.status}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>
                                                    {adj.memo || '-'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: 'var(--space-1)' }}>
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination - TODO: Re-implement when API returns meta */}
                            {adjustments.length > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                                    padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)'
                                }}>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        Halaman {page}
                                    </span>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={adjustments.length < 20}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}