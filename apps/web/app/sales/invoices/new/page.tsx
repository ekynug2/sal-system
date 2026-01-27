'use client';

// =============================================================================
// SAL Accounting System - Create Sales Invoice Page
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreateInvoice } from '@/hooks/use-sales';
import { formatCurrency } from '@/lib/api-client';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
    Calculator,
} from 'lucide-react';

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
}

// Sample data - in production these would come from API
const SAMPLE_CUSTOMERS = [
    { id: 1, name: 'Restoran Sederhana', code: 'C00001' },
    { id: 2, name: 'Toko Sembako Jaya', code: 'C00002' },
    { id: 3, name: 'Hotel Bintang Lima', code: 'C00003' },
    { id: 4, name: 'Warung Bu Siti', code: 'C00004' },
];

const SAMPLE_ITEMS = [
    { id: 1, sku: 'FD-001', name: 'Beras Premium 5kg', price: 80000, taxCode: 'NON' },
    { id: 2, sku: 'FD-002', name: 'Minyak Goreng 2L', price: 35000, taxCode: 'NON' },
    { id: 3, sku: 'FD-003', name: 'Gula Pasir 1kg', price: 17000, taxCode: 'NON' },
    { id: 4, sku: 'BV-001', name: 'Air Mineral 600ml (box)', price: 55000, taxCode: 'PPN11' },
    { id: 5, sku: 'BV-002', name: 'Teh Botol 450ml (box)', price: 100000, taxCode: 'PPN11' },
    { id: 6, sku: 'DY-001', name: 'Susu UHT Full Cream 1L', price: 260000, taxCode: 'NON' },
    { id: 7, sku: 'MT-001', name: 'Ayam Potong Whole', price: 42000, taxCode: 'NON' },
    { id: 8, sku: 'MT-002', name: 'Daging Sapi Has Dalam', price: 155000, taxCode: 'NON' },
    { id: 9, sku: 'CD-001', name: 'Kecap Manis 600ml', price: 22000, taxCode: 'PPN11' },
];

const TAX_RATES: Record<string, number> = {
    'NON': 0,
    'PPN11': 0.11,
    'PPN12': 0.12,
};

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export default function CreateInvoicePage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createInvoice = useCreateInvoice();

    const [customerId, setCustomerId] = useState<number | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<InvoiceLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', qty: 1, unitPrice: 0, discountRate: 0, taxCode: 'PPN11', taxRate: 0.11, description: '' }
    ]);

    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState<string | null>(null);

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

    function addLine() {
        setLines([
            ...lines,
            { id: generateId(), itemId: null, itemSku: '', itemName: '', qty: 1, unitPrice: 0, discountRate: 0, taxCode: 'PPN11', taxRate: 0.11, description: '' }
        ]);
    }

    function removeLine(id: string) {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    }

    function updateLine(id: string, field: keyof InvoiceLine, value: any) {
        setLines(lines.map(l => {
            if (l.id === id) {
                const updated = { ...l, [field]: value };
                if (field === 'taxCode') {
                    updated.taxRate = TAX_RATES[value] || 0;
                }
                return updated;
            }
            return l;
        }));
    }

    function selectItem(lineId: string, item: typeof SAMPLE_ITEMS[0]) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    unitPrice: item.price,
                    taxCode: item.taxCode,
                    taxRate: TAX_RATES[item.taxCode] || 0,
                };
            }
            return l;
        }));
        setShowItemDropdown(null);
        setItemSearch('');
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
            alert('Please select a customer');
            return;
        }

        const validLines = lines.filter(l => l.itemId && l.qty > 0);
        if (validLines.length === 0) {
            alert('Please add at least one item');
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
            alert(`Failed to create invoice: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    const filteredItems = SAMPLE_ITEMS.filter(item =>
        item.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.name.toLowerCase().includes(itemSearch.toLowerCase())
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
                                onClick={() => router.push('/sales/invoices')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">New Sales Invoice</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Create a new invoice for your customer
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/sales/invoices')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createInvoice.isPending}
                            >
                                {createInvoice.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Save Invoice
                            </button>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: '1rem', fontWeight: 600 }}>
                            Invoice Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Customer *
                                </label>
                                <select
                                    value={customerId || ''}
                                    onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
                                    required
                                >
                                    <option value="">Select customer...</option>
                                    {SAMPLE_CUSTOMERS.map(c => (
                                        <option key={c.id} value={c.id}>
                                            [{c.code}] {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Invoice Date *
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
                                    Due Date *
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
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                Line Items
                            </h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addLine}
                                style={{ padding: 'var(--space-2) var(--space-3)' }}
                            >
                                <Plus size={16} />
                                Add Line
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: 900 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 300 }}>Item</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Qty</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Unit Price</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Discount %</th>
                                        <th style={{ width: 100 }}>Tax</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Total</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line, index) => {
                                        const calc = calculateLineTotal(line);
                                        return (
                                            <tr key={line.id}>
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
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Search item..."
                                                            value={showItemDropdown === line.id ? itemSearch : (line.itemName || '')}
                                                            onChange={(e) => {
                                                                setItemSearch(e.target.value);
                                                                setShowItemDropdown(line.id);
                                                            }}
                                                            onFocus={() => setShowItemDropdown(line.id)}
                                                            style={{ paddingLeft: 36 }}
                                                        />
                                                        {showItemDropdown === line.id && (
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
                                                                    maxHeight: 200,
                                                                    overflowY: 'auto',
                                                                }}
                                                            >
                                                                {filteredItems.map(item => (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => selectItem(line.id, item)}
                                                                        style={{
                                                                            padding: 'var(--space-2) var(--space-3)',
                                                                            cursor: 'pointer',
                                                                            borderBottom: '1px solid var(--border-color)',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>{item.sku}</span>
                                                                            <span>{formatCurrency(item.price)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {filteredItems.length === 0 && (
                                                                    <div style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                                        No items found
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
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
                                                    >
                                                        <option value="NON">No Tax</option>
                                                        <option value="PPN11">PPN 11%</option>
                                                        <option value="PPN12">PPN 12%</option>
                                                    </select>
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>
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
                                Notes / Memo
                            </label>
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Add any notes for this invoice..."
                                rows={4}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="card" style={{ padding: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <Calculator size={18} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Summary</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                                    <span className="money">{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                                    <span className="money">{formatCurrency(totals.tax)}</span>
                                </div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border-color)',
                                    fontWeight: 700, fontSize: '1.25rem'
                                }}>
                                    <span>Grand Total</span>
                                    <span className="money">{formatCurrency(totals.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </main>

            {/* Click outside to close dropdown */}
            {showItemDropdown && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                    onClick={() => setShowItemDropdown(null)}
                />
            )}
        </div>
    );
}
