'use client';

// =============================================================================
// SAL Accounting System - Inventory Adjustment Detail Page
// =============================================================================

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useInventoryAdjustment, usePostAdjustment } from '@/hooks/use-inventory';
import { formatDate, formatNumber } from '@/lib/api-client';
import {
    ArrowLeft,
    Loader2,
    Calendar,
    FileText,
    CheckCircle,
    AlertCircle,
    ShieldCheck,
} from 'lucide-react';

export default function AdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idString } = use(params);
    const id = Number(idString);

    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const { data: adjustment, isLoading, error } = useInventoryAdjustment(id);
    const postAdjustment = usePostAdjustment();

    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }

    if (isLoading) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-500)' }} />
                </main>
            </div>
        );
    }

    if (error || !adjustment) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <AlertCircle size={48} style={{ color: 'var(--accent-red)', margin: '0 auto' }} />
                        <h2 style={{ marginTop: 'var(--space-4)' }}>Penyesuaian Tidak Ditemukan</h2>
                        <button className="btn btn-secondary" onClick={() => router.push('/inventory/adjustments')}>
                            Kembali ke Daftar
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    async function handlePost() {
        if (!confirm('Apakah Anda yakin ingin memposting penyesuaian ini? Level stok akan diperbarui secara permanen.')) return;

        try {
            await postAdjustment.mutateAsync(id);
            alert('Penyesuaian berhasil diposting');
        } catch (err) {
            alert(`Gagal memposting: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }

    const isPosted = adjustment.status === 'POSTED';
    const totalLines = adjustment.lines?.length || 0;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => router.push('/inventory/adjustments')}
                            style={{ padding: 'var(--space-2)' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <h1 className="page-title">{adjustment.adjustmentNo}</h1>
                                <span className={`badge ${isPosted ? 'badge-green' :
                                    adjustment.status === 'DRAFT' ? 'badge-gray' : 'badge-red'
                                    }`}>
                                    {adjustment.status}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                Penyesuaian {adjustment.adjustmentType}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {!isPosted && (
                            <button
                                className="btn btn-primary"
                                onClick={handlePost}
                                disabled={postAdjustment.isPending}
                            >
                                {postAdjustment.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <ShieldCheck size={18} />
                                )}
                                Posting Penyesuaian
                            </button>
                        )}
                        {/* {isPosted && (
                            <button className="btn btn-secondary" disabled>
                                <Lock size={18} /> Posted
                            </button>
                        )} */}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {/* Line Items */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Baris ({totalLines})</h3>
                            </div>
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th>Barang</th>
                                        <th style={{ textAlign: 'right' }}>Delta Jml</th>
                                        {isPosted && <th style={{ textAlign: 'right' }}>Biaya Satuan</th>}
                                        {isPosted && <th style={{ textAlign: 'right' }}>Perubahan Nilai</th>}
                                        <th>Alasan</th>
                                        <th>Memo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adjustment.lines?.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{line.itemName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{line.itemSku}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: line.qtyDelta > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                {line.qtyDelta > 0 ? '+' : ''}{line.qtyDelta}
                                            </td>
                                            {isPosted && (
                                                <td style={{ textAlign: 'right' }}>
                                                    {formatNumber(line.unitCost)}
                                                </td>
                                            )}
                                            {isPosted && (
                                                <td style={{ textAlign: 'right' }}>
                                                    {formatNumber(line.valueDelta || (line.qtyDelta * line.unitCost))}
                                                </td>
                                            )}
                                            <td>
                                                <span className="badge badge-gray">{line.reasonCode}</span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>
                                                {line.memo || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar / Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="card" style={{ padding: 'var(--space-4)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Ringkasan</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tanggal</div>
                                        <div style={{ fontWeight: 500 }}>{formatDate(adjustment.adjDate)}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <FileText size={18} style={{ color: 'var(--text-muted)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Memo</div>
                                        <div style={{ fontStyle: 'italic' }}>{adjustment.memo || 'Tidak ada memo'}</div>
                                    </div>
                                </div>
                                {isPosted && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                                        <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                                            <div style={{ fontWeight: 500, color: 'var(--accent-green)' }}>Diposting</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
