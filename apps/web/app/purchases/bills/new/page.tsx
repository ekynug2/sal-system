'use client';

// =============================================================================
// SAL Accounting System - Create Purchase Bill
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreatePurchaseBill } from '@/hooks/use-purchases';
import { formatCurrency } from '@/lib/api-client';
import type { Item, Supplier } from '@/shared/types';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
} from 'lucide-react';
import { SelectSupplierModal, SelectItemModal } from '@/ui/components/select-modals';

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

    // State
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<BillLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', description: '', qty: 1, unitCost: 0, taxCode: 'PPN', memo: '' }
    ]);

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);

    if (authLoading) return null;
    if (!user) { router.push('/login'); return null; }

    // Helpers
    function addLine() {
        setLines([...lines, { id: generateId(), itemId: null, itemSku: '', itemName: '', description: '', qty: 1, unitCost: 0, taxCode: 'PPN', memo: '' }]);
    }

    function removeLine(id: string) {
        if (lines.length > 1) setLines(lines.filter(l => l.id !== id));
    }

    function updateLine(id: string, field: keyof BillLine, value: string | number) {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    }

    function selectItem(lineId: string, item: Item) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    description: '', // Default desc empty
                    unitCost: 0, // Should be last purchase price, ideally
                };
            }
            return l;
        }));
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
        if (!selectedSupplier) { alert('Silakan pilih pemasok'); return; }

        const validLines = lines.filter(l => l.itemId && l.qty > 0 && l.unitCost >= 0);
        if (validLines.length === 0) { alert('Silakan tambahkan setidaknya satu barang yang valid'); return; }

        try {
            const result = await createBill.mutateAsync({
                supplierId: selectedSupplier.id,
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
            alert(`Gagal membuat tagihan: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }




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
                            <h1 className="page-title">Tagihan Pembelian Baru</h1>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => router.push('/purchases/bills')}>Batal</button>
                            <button type="submit" className="btn btn-primary" disabled={createBill.isPending}>
                                {createBill.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Simpan Draft
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                            {/* Supplier & Info */}
                            <div className="card" style={{ padding: 'var(--space-5)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label className="label">Pemasok *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                            <input
                                                type="text"
                                                placeholder="Pilih pemasok..."
                                                value={selectedSupplier?.name || ''}
                                                readOnly
                                                onClick={() => setIsSupplierModalOpen(true)}
                                                className="input pl-9"
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">No. Faktur Pemasok</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={supplierInvoiceNo}
                                            onChange={e => setSupplierInvoiceNo(e.target.value)}
                                            placeholder="cth. INV-2023-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Tanggal Tagihan *</label>
                                        <input type="date" className="input" value={billDate} onChange={e => setBillDate(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="label">Tanggal Jatuh Tempo *</label>
                                        <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                                    </div>
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="card" style={{ padding: 0 }}>
                                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Barang</h3>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={16} /> Tambah Barang</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ minWidth: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '25%' }}>Barang</th>
                                                <th style={{ width: '25%' }}>Deskripsi</th>
                                                <th style={{ width: '10%', textAlign: 'right' }}>Qty</th>
                                                <th style={{ width: '15%', textAlign: 'right' }}>Biaya</th>
                                                <th style={{ width: '10%' }}>Pajak</th>
                                                <th style={{ width: '10%', textAlign: 'right' }}>Total</th>
                                                <th style={{ width: '5%' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map(line => (
                                                <tr key={line.id} style={{ verticalAlign: 'top' }}>
                                                    <td style={{ position: 'relative' }}>
                                                        <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Pilih barang..."
                                                            value={line.itemName}
                                                            readOnly
                                                            onClick={() => { setActiveLineId(line.id); setIsItemModalOpen(true); }}
                                                            className="input pl-9 w-full"
                                                            style={{
                                                                border: !line.itemId ? '1px solid var(--accent-red)' : undefined,
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="input w-full px-2"
                                                            value={line.description}
                                                            onChange={e => updateLine(line.id, 'description', e.target.value)}
                                                            placeholder="Deskripsi"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input type="number" className="input text-right w-full px-2" value={line.qty} onChange={e => updateLine(line.id, 'qty', Number(e.target.value))} min={0} />
                                                    </td>
                                                    <td>
                                                        <input type="number" className="input text-right w-full px-2" value={line.unitCost} onChange={e => updateLine(line.id, 'unitCost', Number(e.target.value))} min={0} />
                                                    </td>
                                                    <td>
                                                        <select className="input w-full px-2" value={line.taxCode} onChange={e => updateLine(line.id, 'taxCode', e.target.value)}>
                                                            <option value="PPN">PPN (11%)</option>
                                                            <option value="NON">Tanpa Pajak</option>
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
                                                <td colSpan={5} style={{ textAlign: 'right' }}>Subtotal</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                                                <td></td>
                                            </tr>
                                            {taxTotal > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={5} style={{ textAlign: 'right' }}>Pajak (11%)</td>
                                                    <td style={{ textAlign: 'right' }}>{formatCurrency(taxTotal)}</td>
                                                    <td></td>
                                                </tr>
                                            )}
                                            <tr style={{ background: 'var(--primary-50)', fontWeight: 700, fontSize: '1.1rem' }}>
                                                <td colSpan={5} style={{ textAlign: 'right' }}>Total</td>
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
                                    placeholder="Tambahkan catatan..."
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Overlay for dropdown */}
                <SelectSupplierModal
                    isOpen={isSupplierModalOpen}
                    onClose={() => setIsSupplierModalOpen(false)}
                    onSelect={(s) => {
                        setSelectedSupplier(s);
                        setIsSupplierModalOpen(false);
                        if (s.termsDays) {
                            const d = new Date(billDate);
                            d.setDate(d.getDate() + s.termsDays);
                            setDueDate(d.toISOString().split('T')[0]);
                        }
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
            </main>
        </div>
    );
}

// Add CSS classes inline for this file or update global CSS

