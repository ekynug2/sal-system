'use client';

// =============================================================================
// SAL Accounting System - Purchase Bill Detail Page
// =============================================================================

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { usePurchaseBill, usePostPurchaseBill } from '@/hooks/use-purchases';
import { formatDate, formatCurrency } from '@/lib/api-client';
import {
    ArrowLeft,
    Loader2,
    Calendar,
    FileText,
    CheckCircle,
    AlertCircle,
    ShieldCheck,
    Truck,
} from 'lucide-react';

export default function PurchaseBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: idString } = use(params);
    const id = Number(idString);

    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const { data: bill, isLoading, error } = usePurchaseBill(id);
    const postBill = usePostPurchaseBill();

    if (authLoading) return null;
    if (!user) { router.push('/login'); return null; }

    if (isLoading) return <LoadingScreen />;
    if (error || !bill) return <ErrorScreen router={router} />;

    async function handlePost() {
        if (!confirm('Apakah Anda yakin ingin memposting tagihan ini? Persediaan akan diperbarui dan hutang usaha akan dicatat.')) return;
        try {
            await postBill.mutateAsync(id);
            alert('Tagihan berhasil diposting');
        } catch (err) {
            alert(`Gagal memposting: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }

    const isPosted = bill.status === 'POSTED' || bill.status === 'PAID' || bill.status === 'PARTIALLY_PAID';

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => router.push('/purchases/bills')} style={{ padding: 'var(--space-2)' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <h1 className="page-title">{bill.billNo}</h1>
                                <span className={`badge ${bill.status === 'POSTED' ? 'badge-green' :
                                    bill.status === 'PAID' ? 'badge-blue' :
                                        bill.status === 'DRAFT' ? 'badge-gray' : 'badge-red'
                                    }`}>
                                    {bill.status}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                Tagihan Pembelian dari {bill.supplierName}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {bill.status === 'DRAFT' && (
                            <button
                                className="btn btn-primary"
                                onClick={handlePost}
                                disabled={postBill.isPending}
                            >
                                {postBill.isPending ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                                Posting Tagihan
                            </button>
                        )}
                        {/* Add Payment Button if Posted/Partially Paid? Later feature. */}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                        {/* Items */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Barang ({bill.lines.length})</h3>
                            </div>
                            <table className="compact-table">
                                <thead>
                                    <tr>
                                        <th>Barang</th>
                                        <th style={{ textAlign: 'right' }}>Jml</th>
                                        <th style={{ textAlign: 'right' }}>Biaya</th>
                                        <th style={{ textAlign: 'right' }}>Pajak</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bill.lines.map((line, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{line.itemName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{line.itemSku}</div>
                                                {line.description && line.description !== line.itemName && (
                                                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{line.description}</div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{line.qty}</td>
                                            <td style={{ textAlign: 'right' }}>{formatCurrency(line.unitCost)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {formatCurrency(line.lineTax)}
                                                <div style={{ fontSize: '0.7srem', color: 'var(--text-secondary)' }}>{line.taxCode}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(line.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'right', paddingRight: 'var(--space-4)' }}>Subtotal</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(bill.subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'right', paddingRight: 'var(--space-4)' }}>Total Pajak</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(bill.taxTotal)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--primary-50)', fontSize: '1.1rem' }}>
                                        <td colSpan={4} style={{ textAlign: 'right', paddingRight: 'var(--space-4)', fontWeight: 700 }}>Total Akhir</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-600)' }}>{formatCurrency(bill.grandTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="card" style={{ padding: 'var(--space-4)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Informasi</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <InfoRow icon={<Truck size={16} />} label="Pemasok" value={bill.supplierName} />
                                {bill.supplierInvoiceNo && (
                                    <InfoRow icon={<FileText size={16} />} label="Ref. Pemasok" value={bill.supplierInvoiceNo} />
                                )}
                                <InfoRow icon={<Calendar size={16} />} label="Tanggal Tagihan" value={formatDate(bill.billDate)} />
                                <InfoRow icon={<Calendar size={16} />} label="Jatuh Tempo" value={formatDate(bill.dueDate)} />

                                {isPosted && (
                                    <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--accent-green)' }}>
                                            <CheckCircle size={16} />
                                            <span style={{ fontWeight: 500 }}>Tagihan Diposting</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {bill.memo && (
                            <div className="card" style={{ padding: 'var(--space-4)' }}>
                                <h3 className="text-sm font-semibold mb-2">Memo</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>{bill.memo}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content center-content">
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-500)' }} />
            </main>
        </div>
    );
}

function ErrorScreen({ router }: { router: { push: (url: string) => void } }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content center-content">
                <div className="card text-center p-8">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2>Tagihan Tidak Ditemukan</h2>
                    <button className="btn btn-secondary mt-4" onClick={() => router.push('/purchases/bills')}>Kembali ke Daftar</button>
                </div>
            </main>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontWeight: 500 }}>{value}</div>
            </div>
        </div>
    );
}
