'use client';

// =============================================================================
// SAL Accounting System - Sales Invoice Detail Page
// =============================================================================

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesInvoice, usePostInvoice } from '@/hooks/use-sales';
import { useSettings } from '@/hooks/use-settings';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { generateDocumentPrint, printHTML, buildHeaderSettings } from '@/lib/print-utils';
import {
    ArrowLeft,
    FileText,
    Send,
    Printer,
    Download,
    Loader2,
    Building2,
    Calendar,
    CreditCard,
    Package,
} from 'lucide-react';

const statusColors: Record<string, string> = {
    DRAFT: 'badge-draft',
    POSTED: 'badge-posted',
    PARTIALLY_PAID: 'badge-partial',
    PAID: 'badge-paid',
    VOIDED: 'badge-voided',
};

/**
 * Sales invoice detail page component that displays invoice metadata, customer info,
 * line items, totals, and memo, and provides actions to post or print the invoice.
 *
 * The component redirects unauthenticated users to the login page, shows loading and
 * error states while fetching data, and derives print header settings from application settings.
 *
 * @returns The JSX element rendering the sales invoice detail page
 */
export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = Number(params.id);
    const { user, isLoading: authLoading } = useAuth();

    const { data: invoice, isLoading, error } = useSalesInvoice(invoiceId);
    const postInvoice = usePostInvoice();
    const { data: settings } = useSettings();

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

    async function handlePost() {
        if (confirm('Apakah Anda yakin ingin memposting faktur ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                await postInvoice.mutateAsync(invoiceId);
                alert('Faktur berhasil diposting!');
            } catch (err) {
                alert(`Gagal memposting faktur: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
            }
        }
    }

    const handlePrint = () => {
        if (!invoice) return;

        const headerSettings = buildHeaderSettings(settings);

        const html = generateDocumentPrint({
            documentType: 'Faktur Penjualan',
            documentNo: invoice.invoiceNo,
            date: formatDate(invoice.invoiceDate),
            dueDate: formatDate(invoice.dueDate),
            partyName: invoice.customerName,
            lines: invoice.lines.map((line) => ({
                description: line.itemName || line.itemSku || 'Barang Tidak Diketahui',
                qty: line.qty,
                unitPrice: line.unitPrice,
                total: line.lineTotal,
            })),
            subtotal: invoice.subtotal,
            taxTotal: invoice.taxTotal,
            grandTotal: invoice.grandTotal,
            memo: invoice.memo,
            headerSettings,
        });

        printHTML(html, `Faktur_${invoice.invoiceNo}`);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => router.push('/sales/invoices')}
                            style={{ padding: 'var(--space-2)' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <h1 className="page-title">
                                    {isLoading ? 'Memuat...' : invoice?.invoiceNo || 'Faktur Tidak Ditemukan'}
                                </h1>
                                {invoice && (
                                    <span className={`badge ${statusColors[invoice.status] || 'badge-draft'}`}>
                                        {invoice.status.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                Detail Faktur Penjualan
                            </p>
                        </div>
                    </div>
                    {invoice && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>

                            {invoice.status === 'DRAFT' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePost}
                                    disabled={postInvoice.isPending}
                                >
                                    {postInvoice.isPending ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    Posting Faktur
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={handlePrint}>
                                <Printer size={18} />
                                Cetak
                            </button>
                            <button className="btn btn-secondary" onClick={handlePrint}>
                                <Download size={18} />
                                PDF
                            </button>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                        <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                            Memuat faktur...
                        </p>
                    </div>
                ) : error || !invoice ? (
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                        <FileText size={48} style={{ color: 'var(--accent-red)', margin: '0 auto' }} />
                        <h3 style={{ marginTop: 'var(--space-4)', color: 'var(--accent-red)' }}>
                            Faktur Tidak Ditemukan
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            Faktur yang Anda cari tidak ditemukan atau Anda tidak memiliki izin untuk melihatnya.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-4)' }}
                            onClick={() => router.push('/sales/invoices')}
                        >
                            Kembali ke Daftar Faktur
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Invoice Info Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                            {/* Customer Info */}
                            <div className="card" style={{ padding: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: 'var(--primary-100)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Building2 size={20} color="var(--primary-500)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            Pelanggan
                                        </div>
                                        <div style={{ fontWeight: 600 }}>{invoice.customerName}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="card" style={{ padding: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: 'var(--primary-100)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Calendar size={20} color="var(--primary-500)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tanggal Faktur</div>
                                                <div style={{ fontWeight: 500 }}>{formatDate(invoice.invoiceDate)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jatuh Tempo</div>
                                                <div style={{ fontWeight: 500 }}>{formatDate(invoice.dueDate)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div className="card" style={{ padding: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: invoice.balanceDue > 0 ? 'var(--accent-red-light)' : 'var(--accent-green-light)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <CreditCard size={20} color={invoice.balanceDue > 0 ? 'var(--accent-red)' : 'var(--accent-green)'} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dibayar</div>
                                                <div style={{ fontWeight: 500, color: 'var(--accent-green)' }}>
                                                    {formatCurrency(invoice.paidAmount)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saldo Hutang</div>
                                                <div style={{ fontWeight: 600, color: invoice.balanceDue > 0 ? 'var(--accent-red)' : 'inherit' }}>
                                                    {formatCurrency(invoice.balanceDue)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
                            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Package size={18} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Daftar Barang</h3>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    ({invoice.lines.length} barang)
                                </span>
                            </div>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 50 }}>#</th>
                                            <th>Barang</th>
                                            <th style={{ textAlign: 'right' }}>Jml</th>
                                            <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                                            <th style={{ textAlign: 'right' }}>Diskon</th>
                                            <th style={{ textAlign: 'right' }}>Pajak</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.lines.map((line) => (
                                            <tr key={line.lineNo}>
                                                <td style={{ color: 'var(--text-muted)' }}>{line.lineNo}</td>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{line.itemName || line.itemSku}</div>
                                                    {line.description && (
                                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                            {line.description}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                        {line.itemSku}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{line.qty}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(line.unitPrice)}
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                    {line.discountRate > 0 ? `${line.discountRate}%` : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                    {line.taxCode} ({(line.taxRate * 100).toFixed(0)}%)
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {formatCurrency(line.lineTotal)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div className="card" style={{ width: 360, padding: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                                        <span className="money">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    {invoice.discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Diskon</span>
                                            <span className="money" style={{ color: 'var(--accent-red)' }}>
                                                -{formatCurrency(invoice.discountAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Pajak</span>
                                        <span className="money">{formatCurrency(invoice.taxTotal)}</span>
                                    </div>
                                    {invoice.shippingFee > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Pengiriman</span>
                                            <span className="money">{formatCurrency(invoice.shippingFee)}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border-color)',
                                        fontWeight: 700, fontSize: '1.125rem'
                                    }}>
                                        <span>Total Akhir</span>
                                        <span className="money">{formatCurrency(invoice.grandTotal)}</span>
                                    </div>
                                    {invoice.balanceDue > 0 && invoice.paidAmount > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)' }}>
                                                <span>Dibayar</span>
                                                <span className="money">-{formatCurrency(invoice.paidAmount)}</span>
                                            </div>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                fontWeight: 700, color: 'var(--accent-red)'
                                            }}>
                                                <span>Saldo Hutang</span>
                                                <span className="money">{formatCurrency(invoice.balanceDue)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Memo */}
                        {invoice.memo && (
                            <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)' }}>
                                <h4 style={{ margin: 0, marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Catatan / Memo
                                </h4>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{invoice.memo}</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}