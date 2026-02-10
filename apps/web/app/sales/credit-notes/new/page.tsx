'use client';

// =============================================================================
// SAL Accounting System - Create Sales Credit Note Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesInvoices } from '@/hooks/use-sales';
import { apiGet, apiPost, formatCurrency } from '@/lib/api-client';
import {
    ArrowLeft,
    Trash2,
    Save,
    Loader2,
    Search,
} from 'lucide-react';
import type { SalesInvoice } from '@/shared/types';

interface CreditNoteLine {
    id: string;
    itemId: number;
    itemSku: string;
    itemName: string;
    qty: number;
    unitPrice: number;
    taxCode: string;
    taxRate: number;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
    memo: string;
}

const REASON_CODES = [
    { code: 'RETURN', label: 'Retur' },
    { code: 'PRICE_ADJUSTMENT', label: 'Penyesuaian Harga' },
    { code: 'DAMAGED', label: 'Barang Rusak' },
    { code: 'OTHER', label: 'Lainnya' },
];

/**
 * Generate a short random identifier string.
 *
 * @returns A 7-character lowercase alphanumeric identifier created from a base-36 random value.
 */
function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

function useCreateCreditNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: {
            invoiceId: number;
            creditDate: string;
            reasonCode: string;
            restock: boolean;
            lines: { itemId: number; qty: number; unitPrice: number; taxCode: string; memo?: string }[];
            memo?: string;
        }) => apiPost<{ id: number }>('/sales/credit-notes', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales', 'credit-notes'] });
        },
    });
}

/**
 * Page component for creating a new sales credit note with invoice selection, line editing, and submission.
 *
 * The component lets a user pick a posted sales invoice, adjust quantities for credit lines, set credit metadata
 * (date, reason, restock flag, memo), view recalculated totals, and submit a credit note to the API. It guards
 * access by authentication, validates required fields and line quantities before submission, and navigates to the
 * created credit note on success.
 *
 * @returns A React element that renders the Create Credit Note page UI.
 */
export default function CreateCreditNotePage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createCreditNote = useCreateCreditNote();

    // State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
    const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
    const [reasonCode, setReasonCode] = useState('RETURN');
    const [restock, setRestock] = useState(true);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<CreditNoteLine[]>([]);
    const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
    const [invoiceSearch, setInvoiceSearch] = useState('');

    const { data: invoices = [], isLoading: invoicesLoading } = useSalesInvoices({
        status: 'POSTED',
        limit: 100
    });

    // Fetch selected invoice details
    const { data: selectedInvoice } = useQuery({
        queryKey: ['sales', 'invoices', selectedInvoiceId],
        queryFn: () => apiGet<SalesInvoice>(`/sales/invoices/${selectedInvoiceId}`),
        enabled: !!selectedInvoiceId,
    });

    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }

    function selectInvoice(invoice: SalesInvoice) {
        setSelectedInvoiceId(invoice.id);
        // Pre-populate lines from invoice
        const newLines: CreditNoteLine[] = invoice.lines.map(l => ({
            id: generateId(),
            itemId: l.itemId,
            itemSku: l.itemSku || '',
            itemName: l.itemName || '',
            qty: l.qty,
            unitPrice: l.unitPrice,
            taxCode: l.taxCode,
            taxRate: l.taxRate,
            lineSubtotal: l.lineSubtotal,
            lineTax: l.lineTax,
            lineTotal: l.lineTotal,
            memo: '',
        }));
        setLines(newLines);
        setShowInvoiceDropdown(false);
        setInvoiceSearch('');
    }

    function updateLineQty(id: string, qty: number) {
        setLines(lines.map(l => {
            if (l.id === id) {
                const lineSubtotal = qty * l.unitPrice;
                const lineTax = lineSubtotal * l.taxRate;
                return {
                    ...l,
                    qty,
                    lineSubtotal,
                    lineTax,
                    lineTotal: lineSubtotal + lineTax,
                };
            }
            return l;
        }));
    }

    function removeLine(id: string) {
        setLines(lines.filter(l => l.id !== id));
    }

    // Calculate totals
    const subtotal = lines.reduce((sum, l) => sum + l.lineSubtotal, 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.lineTax, 0);
    const grandTotal = subtotal + taxTotal;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!selectedInvoiceId) {
            alert('Silakan pilih faktur');
            return;
        }

        const validLines = lines.filter(l => l.qty > 0);
        if (validLines.length === 0) {
            alert('Silakan tambahkan setidaknya satu barang dengan jumlah > 0');
            return;
        }

        try {
            const result = await createCreditNote.mutateAsync({
                invoiceId: selectedInvoiceId,
                creditDate,
                reasonCode,
                restock,
                lines: validLines.map(l => ({
                    itemId: l.itemId,
                    qty: l.qty,
                    unitPrice: l.unitPrice,
                    taxCode: l.taxCode,
                    memo: l.memo || undefined,
                })),
                memo: memo || undefined,
            });

            router.push(`/sales/credit-notes/${result.id}`);
        } catch (err) {
            alert(`Gagal membuat nota kredit: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }

    const filteredInvoices = invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase())
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="page-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => router.push('/sales/credit-notes')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">Nota Kredit Baru</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Buat retur pelanggan atau penyesuaian kredit
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/sales/credit-notes')}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createCreditNote.isPending}
                            >
                                {createCreditNote.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Simpan Nota Kredit
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            {/* Invoice Selection */}
                            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Faktur Asal *
                                </label>
                                <div style={{ position: 'relative' }}>
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
                                        placeholder="Cari faktur..."
                                        value={showInvoiceDropdown ? invoiceSearch : (selectedInvoice ? `${selectedInvoice.invoiceNo} - ${selectedInvoice.customerName}` : '')}
                                        onChange={(e) => {
                                            setInvoiceSearch(e.target.value);
                                            setShowInvoiceDropdown(true);
                                        }}
                                        onFocus={() => setShowInvoiceDropdown(true)}
                                        style={{ paddingLeft: 42 }}
                                        autoComplete="off"
                                    />
                                    {showInvoiceDropdown && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                boxShadow: 'var(--shadow-lg)',
                                                zIndex: 100,
                                                maxHeight: 300,
                                                overflowY: 'auto',
                                            }}
                                        >
                                            {invoicesLoading ? (
                                                <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>Memuat...</div>
                                            ) : filteredInvoices.length === 0 ? (
                                                <div style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                    Faktur tidak ditemukan
                                                </div>
                                            ) : (
                                                filteredInvoices.map(inv => (
                                                    <div
                                                        key={inv.id}
                                                        onClick={() => selectInvoice(inv)}
                                                        style={{
                                                            padding: 'var(--space-2) var(--space-3)',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid var(--border-color)',
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ fontWeight: 500 }}>{inv.invoiceNo}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>{inv.customerName}</span>
                                                            <span>{formatCurrency(inv.grandTotal)}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Tanggal Kredit *
                                </label>
                                <input
                                    type="date"
                                    value={creditDate}
                                    onChange={(e) => setCreditDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Kode Alasan *
                                </label>
                                <select
                                    value={reasonCode}
                                    onChange={(e) => setReasonCode(e.target.value)}
                                    required
                                >
                                    {REASON_CODES.map(r => (
                                        <option key={r.code} value={r.code}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    id="restock"
                                    checked={restock}
                                    onChange={(e) => setRestock(e.target.checked)}
                                    style={{ width: 'auto' }}
                                />
                                <label htmlFor="restock" style={{ fontSize: '0.875rem' }}>
                                    Kembalikan barang ke stok
                                </label>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Memo
                                </label>
                                <input
                                    type="text"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="Alasan nota kredit..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    {selectedInvoice && lines.length > 0 && (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                    Baris Nota Kredit
                                </h3>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ minWidth: 700 }}>
                                    <thead>
                                        <tr>
                                            <th>Barang</th>
                                            <th style={{ width: 100, textAlign: 'right' }}>Harga Satuan</th>
                                            <th style={{ width: 100, textAlign: 'right' }}>Jml Dikreditkan</th>
                                            <th style={{ width: 120, textAlign: 'right' }}>Subtotal</th>
                                            <th style={{ width: 100, textAlign: 'right' }}>Pajak</th>
                                            <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line) => (
                                            <tr key={line.id} style={{ verticalAlign: 'top' }}>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{line.itemName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{line.itemSku}</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(line.unitPrice)}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={line.qty}
                                                        onChange={(e) => updateLineQty(line.id, Number(e.target.value))}
                                                        style={{ textAlign: 'right', width: 80 }}
                                                    />
                                                </td>
                                                <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(line.lineSubtotal)}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(line.lineTax)}</td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(line.lineTotal)}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => removeLine(line.id)}
                                                        style={{ padding: 'var(--space-2)', color: 'var(--accent-red)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 500 }}>Subtotal</td>
                                            <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 500 }}>Pajak</td>
                                            <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(taxTotal)}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>Total Akhir</td>
                                            <td colSpan={3} className="money" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-600)' }}>
                                                {formatCurrency(grandTotal)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </form>
            </main>

            {/* Click outside to close dropdown */}
            {showInvoiceDropdown && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                    onClick={() => setShowInvoiceDropdown(false)}
                />
            )}
        </div>
    );
}