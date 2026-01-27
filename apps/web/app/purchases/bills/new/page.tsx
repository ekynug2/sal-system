'use client';

// =============================================================================
// SAL Accounting System - Create Purchase Bill
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreatePurchaseBill } from '@/hooks/use-purchases';
import { useItems, useSuppliers } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
    Calendar,
} from 'lucide-react';

interface BillLine {
    id: string;
    itemId: number | null;
    itemSku: string;
    itemName: string;
    description: string;
    qty: number;
    unitCost: number;
    taxCode: 'PPN' | 'NON';
    memo: string;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export default function CreateBillPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createBill = useCreatePurchaseBill();

    // Master Data
    const { data: itemsData } = useItems({ sellableOnly: false });
    const { data: suppliersData } = useSuppliers();

    const items = itemsData || [];
    const suppliers = suppliersData || [];

    // State
    const [supplierId, setSupplierId] = useState<number | null>(null);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<BillLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', description: '', qty: 1, unitCost: 0, taxCode: 'PPN', memo: '' }
    ]);

    const [itemSearch, setItemSearch] = useState('');
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    if (authLoading) return null;
    if (!user) { router.push('/login'); return null; }

    // Helpers
    function addLine() {
        setLines([...lines, { id: generateId(), itemId: null, itemSku: '', itemName: '', description: '', qty: 1, unitCost: 0, taxCode: 'PPN', memo: '' }]);
    }

    function removeLine(id: string) {
        if (lines.length > 1) setLines(lines.filter(l => l.id !== id));
    }

    function updateLine(id: string, field: keyof BillLine, value: any) {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    }

    function selectItem(lineId: string, item: any) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    description: item.name, // Default desc
                    unitCost: 0, // Should be last purchase price, ideally
                };
            }
            return l;
        }));
        setActiveLineId(null);
        setItemSearch('');
    }

    // Calculations
    const subtotal = lines.reduce((sum, l) => sum + (l.qty * l.unitCost), 0);
    const taxTotal = lines.reduce((sum, l) => {
        const lineTotal = l.qty * l.unitCost;
        return sum + (l.taxCode === 'PPN' ? lineTotal * 0.11 : 0);
    }, 0);
    const grandTotal = subtotal + taxTotal;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!supplierId) { alert('Please select a supplier'); return; }

        const validLines = lines.filter(l => l.itemId && l.qty > 0 && l.unitCost >= 0);
        if (validLines.length === 0) { alert('Please add at least one valid item'); return; }

        try {
            const result = await createBill.mutateAsync({
                supplierId,
                supplierInvoiceNo: supplierInvoiceNo || undefined,
                billDate,
                dueDate,
                memo: memo || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId!,
                    description: l.description,
                    qty: l.qty,
                    unitCost: l.unitCost,
                    taxCode: l.taxCode,
                    memo: l.memo || undefined,
                })),
            });
            router.push(`/purchases/bills/${result.id}`);
        } catch (err) {
            alert(`Failed to create bill: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    );

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="page-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => router.push('/purchases/bills')}>
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="page-title">New Purchase Bill</h1>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => router.push('/purchases/bills')}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={createBill.isPending}>
                                {createBill.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Save Draft
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                            {/* Supplier & Info */}
                            <div className="card" style={{ padding: 'var(--space-5)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label className="label">Supplier *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                                            <input
                                                type="text"
                                                placeholder="Search supplier..."
                                                value={supplierSearch}
                                                onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                                                onFocus={() => { setSupplierSearch(''); setShowSupplierDropdown(true); }}
                                                className="input pl-9"
                                            />
                                            {showSupplierDropdown && (
                                                <div className="dropdown-menu">
                                                    {filteredSuppliers.map(s => (
                                                        <div key={s.id} className="dropdown-item" onClick={() => {
                                                            setSupplierId(s.id);
                                                            setSupplierSearch(s.name);
                                                            setShowSupplierDropdown(false);
                                                            // Set default terms if available
                                                            if (s.termsDays) {
                                                                const d = new Date(billDate);
                                                                d.setDate(d.getDate() + s.termsDays);
                                                                setDueDate(d.toISOString().split('T')[0]);
                                                            }
                                                        }}>
                                                            <div style={{ fontWeight: 500 }}>{s.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.supplierCode}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Supplier Invoice No</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={supplierInvoiceNo}
                                            onChange={e => setSupplierInvoiceNo(e.target.value)}
                                            placeholder="e.g. INV-2023-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Bill Date *</label>
                                        <input type="date" className="input" value={billDate} onChange={e => setBillDate(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="label">Due Date *</label>
                                        <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                                    </div>
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Items</h3>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={16} /> Add Item</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ minWidth: 900 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 300 }}>Item</th>
                                                <th style={{ width: 80, textAlign: 'right' }}>Qty</th>
                                                <th style={{ width: 120, textAlign: 'right' }}>Cost</th>
                                                <th style={{ width: 100 }}>Tax</th>
                                                <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                                                <th style={{ width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map(line => (
                                                <tr key={line.id} style={{ verticalAlign: 'top' }}>
                                                    <td style={{ position: 'relative' }}>
                                                        <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Select item..."
                                                            value={activeLineId === line.id ? itemSearch : line.itemName}
                                                            onChange={e => { setItemSearch(e.target.value); setActiveLineId(line.id); }}
                                                            onFocus={() => { setItemSearch(''); setActiveLineId(line.id); }}
                                                            className="input pl-9"
                                                            style={{ border: !line.itemId ? '1px solid var(--accent-red)' : undefined }}
                                                        />
                                                        {activeLineId === line.id && (
                                                            <div className="dropdown-menu" style={{ width: 400 }}>
                                                                {filteredItems.slice(0, 10).map(item => (
                                                                    <div key={item.id} className="dropdown-item" onClick={() => selectItem(line.id, item)}>
                                                                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>{item.sku}</span>
                                                                            <span>Stock: {item.onHand}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {line.itemName && (
                                                            <input
                                                                type="text"
                                                                className="input mt-1 text-sm text-gray-500"
                                                                value={line.description}
                                                                onChange={e => updateLine(line.id, 'description', e.target.value)}
                                                                placeholder="Description"
                                                            />
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input type="number" className="input text-right" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} min={0} />
                                                    </td>
                                                    <td>
                                                        <input type="number" className="input text-right" value={line.unitCost} onChange={e => updateLine(line.id, 'unitCost', Number(e.target.value))} min={0} />
                                                    </td>
                                                    <td>
                                                        <select className="input" value={line.taxCode} onChange={e => updateLine(line.id, 'taxCode', e.target.value)}>
                                                            <option value="PPN">PPN (11%)</option>
                                                            <option value="NON">Non-Tax</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingTop: 'var(--space-3)' }}>
                                                        {formatCurrency((line.qty * line.unitCost) * (line.taxCode === 'PPN' ? 1.11 : 1))}
                                                    </td>
                                                    <td>
                                                        <button type="button" className="btn btn-ghost text-red-500" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                <td colSpan={4} style={{ textAlign: 'right' }}>Subtotal</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                                                <td></td>
                                            </tr>
                                            {taxTotal > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={4} style={{ textAlign: 'right' }}>Tax (11%)</td>
                                                    <td style={{ textAlign: 'right' }}>{formatCurrency(taxTotal)}</td>
                                                    <td></td>
                                                </tr>
                                            )}
                                            <tr style={{ background: 'var(--primary-50)', fontWeight: 700, fontSize: '1.1rem' }}>
                                                <td colSpan={4} style={{ textAlign: 'right' }}>Total</td>
                                                <td style={{ textAlign: 'right', color: 'var(--primary-600)' }}>{formatCurrency(grandTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="card" style={{ padding: 'var(--space-4)' }}>
                                <h3 className="text-sm font-semibold mb-2">Memo</h3>
                                <textarea
                                    className="input"
                                    rows={4}
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    placeholder="Add a note..."
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Overlay for dropdown */}
                {(activeLineId || showSupplierDropdown) && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { setActiveLineId(null); setShowSupplierDropdown(false); }} />
                )}
            </main>
        </div>
    );
}

// Add CSS classes inline for this file or update global CSS
const css = `
.input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-primary);
}
.label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: 0.875rem;
    font-weight: 500;
}
.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 50;
    max-height: 250px;
    overflow-y: auto;
}
.dropdown-item {
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
}
.dropdown-item:hover {
    background: var(--bg-secondary);
}
`;
