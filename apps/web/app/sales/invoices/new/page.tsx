'use client';

// =============================================================================
// SAL Accounting System - Create Sales Invoice Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreateInvoice } from '@/hooks/use-sales';
import { useCustomers, useItems } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
import { Item } from '@/shared/types';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
    Calculator,
} from 'lucide-react';
import { SelectCustomerModal, SelectItemModal } from '@/ui/components/select-modals';

interface InvoiceLine {
    id: string;
    itemId: number | null;
    itemSku: string;
    itemName: string;
    qty: number;
    unitPrice: number;
    discountRate: number;
    taxCode: string;
    taxRate: number;
    description: string;
    uomCode: string;
}

const TAX_RATES: Record<string, number> = {
    'NON': 0,
    'PPN11': 0.11,
    'PPN12': 0.12,
};

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Render the Create Invoice page UI and handle creating a new sales invoice.
 *
 * Manages master data loading (customers and items), invoice form state (customer, dates, lines, memo),
 * line item selection via modals, totals calculation, and submission of a new invoice to the API.
 *
 * @returns The rendered React element for the Create Invoice page
 */
export default function CreateInvoicePage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createInvoice = useCreateInvoice();

    // Fetch master data
    // Fetch generic lists for initial load. 
    // In a real large-scale app, we might want async search, but for < 100 items/cust loaded by API by default, this is fine.
    const { data: customersData, isLoading: custLoading } = useCustomers({ activeOnly: true });
    const { data: itemsData, isLoading: itemsLoading } = useItems({ sellableOnly: true });

    const customers = customersData || [];
    const items = itemsData || [];

    const [customerId, setCustomerId] = useState<number | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(() =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<InvoiceLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', qty: 1, unitPrice: 0, discountRate: 0, taxCode: 'PPN11', taxRate: 0.11, description: '', uomCode: '' }
    ]);

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);

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

    // Set terms when customer changes
    function handleCustomerChange(custId: number) {
        setCustomerId(custId);
        const cust = customers.find(c => c.id === custId);
        if (cust) {
            const due = new Date(new Date(invoiceDate).getTime() + (cust.termsDays * 24 * 60 * 60 * 1000));
            setDueDate(due.toISOString().split('T')[0]);
        }
    }

    function addLine() {
        setLines([
            ...lines,
            { id: generateId(), itemId: null, itemSku: '', itemName: '', qty: 1, unitPrice: 0, discountRate: 0, taxCode: 'PPN11', taxRate: 0.11, description: '', uomCode: '' }
        ]);
    }

    function removeLine(id: string) {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    }

    function updateLine(id: string, field: keyof InvoiceLine, value: string | number) {
        setLines(lines.map(l => {
            if (l.id === id) {
                const updated = { ...l, [field]: value };
                if (field === 'taxCode') {
                    updated.taxRate = TAX_RATES[value as string] || 0;
                }
                return updated;
            }
            return l;
        }));
    }

    function selectItem(lineId: string, item: Item) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                const taxRate = TAX_RATES[item.taxCode] || 0;
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    unitPrice: item.sellingPrice,
                    taxCode: item.taxCode,
                    taxRate: taxRate,
                    uomCode: item.uomCode,
                };
            }
            return l;
        }));

    }

    function calculateLineTotal(line: InvoiceLine) {
        const base = line.qty * line.unitPrice;
        const discount = base * (line.discountRate / 100);
        const subtotal = base - discount;
        const tax = subtotal * line.taxRate;
        return { subtotal, tax, total: subtotal + tax };
    }

    const totals = lines.reduce((acc, line) => {
        const calc = calculateLineTotal(line);
        return {
            subtotal: acc.subtotal + calc.subtotal,
            tax: acc.tax + calc.tax,
            total: acc.total + calc.total,
        };
    }, { subtotal: 0, tax: 0, total: 0 });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!customerId) {
            alert('Silakan pilih pelanggan');
            return;
        }

        const validLines = lines.filter(l => l.itemId && l.qty > 0);
        if (validLines.length === 0) {
            alert('Silakan tambahkan setidaknya satu barang');
            return;
        }

        try {
            const result = await createInvoice.mutateAsync({
                customerId,
                invoiceDate,
                dueDate,
                memo: memo || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId!,
                    qty: l.qty,
                    unitPrice: l.unitPrice,
                    discountRate: l.discountRate,
                    taxCode: l.taxCode,
                    description: l.description || undefined,
                })),
            });

            router.push(`/sales/invoices/${result.id}`);
        } catch (err) {
            alert(`Gagal membuat faktur: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }



    const isDataLoading = custLoading || itemsLoading;

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
                                onClick={() => router.push('/sales/invoices')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">Faktur Penjualan Baru</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Buat faktur baru untuk pelanggan Anda
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/sales/invoices')}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createInvoice.isPending || isDataLoading}
                            >
                                {createInvoice.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Simpan Faktur
                            </button>
                        </div>
                    </div>

                    {isDataLoading && (
                        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Loader2 className="animate-spin" size={16} />
                            <span style={{ fontSize: '0.875rem' }}>Memuat data master...</span>
                        </div>
                    )}

                    {/* Invoice Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: '1rem', fontWeight: 600 }}>
                            Detail Faktur
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Pelanggan *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        placeholder="Pilih pelanggan..."
                                        value={customers.find(c => c.id === customerId)?.name || ''}
                                        readOnly
                                        onClick={() => setIsCustomerModalOpen(true)}
                                        className="input pl-9"
                                        style={{ cursor: 'pointer', width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Tanggal Faktur *
                                </label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Jatuh Tempo *
                                </label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0 }}>
                        <div style={{
                            padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                Baris Barang
                            </h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addLine}
                                style={{ padding: 'var(--space-2) var(--space-3)' }}
                            >
                                <Plus size={16} />
                                Tambah Baris
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: 900 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 300 }}>Barang</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Jumlah</th>
                                        <th style={{ width: 60 }}>Satuan</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Harga Satuan</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Diskon %</th>
                                        <th style={{ width: 120 }}>Pajak</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Total</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line) => {
                                        const calc = calculateLineTotal(line);
                                        return (
                                            <tr key={line.id} style={{ verticalAlign: 'top' }}>
                                                <td style={{ position: 'relative' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <Search
                                                            size={16}
                                                            style={{
                                                                position: 'absolute',
                                                                left: 10,
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                color: 'var(--text-muted)',
                                                                pointerEvents: 'none',
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Pilih barang..."
                                                            value={line.itemName || ''}
                                                            readOnly
                                                            onClick={() => {
                                                                setActiveLineId(line.id);
                                                                setIsItemModalOpen(true);
                                                            }}
                                                            className="input pl-9"
                                                            style={{
                                                                cursor: 'pointer',
                                                                paddingLeft: 36,
                                                                border: !line.itemId ? '1px solid var(--accent-red)' : undefined
                                                            }}
                                                        />
                                                    </div>
                                                    {line.itemId && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <input
                                                                type="text"
                                                                placeholder="Deskripsi (opsional)"
                                                                value={line.description}
                                                                onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                                                                style={{ fontSize: '0.85rem', padding: 'var(--space-1) var(--space-2)', height: 'auto' }}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={line.qty}
                                                        onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                                                        style={{ textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td>
                                                    <div style={{
                                                        height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'var(--text-secondary)', fontSize: '0.875rem'
                                                    }}>
                                                        {line.uomCode}
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={line.unitPrice}
                                                        onChange={(e) => updateLine(line.id, 'unitPrice', Number(e.target.value))}
                                                        style={{ textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={line.discountRate}
                                                        onChange={(e) => updateLine(line.id, 'discountRate', Number(e.target.value))}
                                                        style={{ textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={line.taxCode}
                                                        onChange={(e) => updateLine(line.id, 'taxCode', e.target.value)}
                                                        style={{ width: '100%' }}
                                                    >
                                                        <option value="NON">Tanpa Pajak</option>
                                                        <option value="PPN11">PPN 11%</option>
                                                        <option value="PPN12">PPN 12%</option>
                                                    </select>
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 600, paddingTop: 10 }}>
                                                    {formatCurrency(calc.total)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => removeLine(line.id)}
                                                        disabled={lines.length === 1}
                                                        style={{ padding: 'var(--space-2)', color: 'var(--accent-red)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals & Notes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-6)' }}>
                        <div className="card" style={{ padding: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Catatan / Memo
                            </label>
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Tambahkan catatan untuk faktur ini..."
                                rows={4}
                                style={{ resize: 'vertical', width: '100%' }}
                            />
                        </div>

                        <div className="card" style={{ padding: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <Calculator size={18} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ringkasan</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                                    <span className="money">{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Pajak</span>
                                    <span className="money">{formatCurrency(totals.tax)}</span>
                                </div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border-color)',
                                    fontWeight: 700, fontSize: '1.25rem'
                                }}>
                                    <span>Total Akhir</span>
                                    <span className="money">{formatCurrency(totals.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            {/* Click outside to close dropdown */}
            <SelectCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={(c) => {
                    handleCustomerChange(c.id);
                    setIsCustomerModalOpen(false);
                }}
            />

            <SelectItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSelect={(item) => {
                    if (activeLineId) {
                        selectItem(activeLineId, item);
                        setIsItemModalOpen(false);
                    }
                }}
            />
        </div>
    );
}