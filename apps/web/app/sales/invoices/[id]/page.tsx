'use client';

// =============================================================================
// SAL Accounting System - Sales Invoice Detail Page
// =============================================================================

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesInvoice, usePostInvoice } from '@/hooks/use-sales';
import { formatCurrency, formatDate } from '@/lib/api-client';
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

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = Number(params.id);
    const { user, isLoading: authLoading } = useAuth();

    const { data: invoice, isLoading, error } = useSalesInvoice(invoiceId);
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

    async function handlePost() {
        if (confirm('Are you sure you want to post this invoice? This action cannot be undone.')) {
            try {
                await postInvoice.mutateAsync(invoiceId);
                alert('Invoice posted successfully!');
            } catch (err) {
                alert(`Failed to post invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    }

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
                                    {isLoading ? 'Loading...' : invoice?.invoiceNo || 'Invoice Not Found'}
                                </h1>
                                {invoice && (
                                    <span className={`badge ${statusColors[invoice.status] || 'badge-draft'}`}>
                                        {invoice.status.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                Sales Invoice Details
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
                                    Post Invoice
                                </button>
                            )}
                            <button className="btn btn-secondary">
                                <Printer size={18} />
                                Print
                            </button>
                            <button className="btn btn-secondary">
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
                            Loading invoice...
                        </p>
                    </div>
                ) : error || !invoice ? (
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                        <FileText size={48} style={{ color: 'var(--accent-red)', margin: '0 auto' }} />
                        <h3 style={{ marginTop: 'var(--space-4)', color: 'var(--accent-red)' }}>
                            Invoice Not Found
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            The invoice you're looking for doesn't exist or you don't have permission to view it.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-4)' }}
                            onClick={() => router.push('/sales/invoices')}
                        >
                            Back to Invoices
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
                                            Customer
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
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invoice Date</div>
                                                <div style={{ fontWeight: 500 }}>{formatDate(invoice.invoiceDate)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</div>
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
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid</div>
                                                <div style={{ fontWeight: 500, color: 'var(--accent-green)' }}>
                                                    {formatCurrency(invoice.paidAmount)}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Balance Due</div>
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
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Line Items</h3>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    ({invoice.lines.length} items)
                                </span>
                            </div>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 50 }}>#</th>
                                            <th>Item</th>
                                            <th style={{ textAlign: 'right' }}>Qty</th>
                                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                                            <th style={{ textAlign: 'right' }}>Discount</th>
                                            <th style={{ textAlign: 'right' }}>Tax</th>
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
                                            <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
                                            <span className="money" style={{ color: 'var(--accent-red)' }}>
                                                -{formatCurrency(invoice.discountAmount)}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                                        <span className="money">{formatCurrency(invoice.taxTotal)}</span>
                                    </div>
                                    {invoice.shippingFee > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                                            <span className="money">{formatCurrency(invoice.shippingFee)}</span>
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border-color)',
                                        fontWeight: 700, fontSize: '1.125rem'
                                    }}>
                                        <span>Grand Total</span>
                                        <span className="money">{formatCurrency(invoice.grandTotal)}</span>
                                    </div>
                                    {invoice.balanceDue > 0 && invoice.paidAmount > 0 && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)' }}>
                                                <span>Paid</span>
                                                <span className="money">-{formatCurrency(invoice.paidAmount)}</span>
                                            </div>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                fontWeight: 700, color: 'var(--accent-red)'
                                            }}>
                                                <span>Balance Due</span>
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
                                    Notes / Memo
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
