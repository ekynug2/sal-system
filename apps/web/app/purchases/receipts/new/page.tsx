'use client';

// =============================================================================
// SAL Accounting System - Create Purchase Receipt Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';

import { apiPost, formatCurrency } from '@/lib/api-client';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
    Package,
} from 'lucide-react';
import { SelectSupplierModal, SelectItemModal } from '@/ui/components/select-modals';
import type { Item, Supplier } from '@/shared/types';

interface ReceiptLine {
    id: string;
    itemId: number;
    itemSku: string;
    itemName: string;
    qty: number;
    unitCost: number;
    taxCode: string;
    taxRate: number;
    lineValue: number;
    lineTax: number;
    memo: string;
}

const TAX_CODES = [
    { code: 'PPN11', label: 'PPN 11%', rate: 0.11 },
    { code: 'PPN0', label: 'PPN 0%', rate: 0 },
    { code: 'EXEMPT', label: 'Bebas Pajak', rate: 0 },
];

/**
 * Generate a short random alphanumeric identifier.
 *
 * @returns A 7-character lowercase alphanumeric string suitable for use as a short identifier
 */
function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

function useCreateReceipt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: {
            supplierId: number;
            receiptDate: string;
            referenceNo?: string;
            memo?: string;
            lines: { itemId: number; qty: number; unitCost: number; taxCode: string; memo?: string }[];
        }) => apiPost<{ id: number }>('/purchases/receipts', input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases', 'receipts'] });
        },
    });
}

/**
 * Renders the "Create Purchase Receipt" page and manages state for composing and submitting a new purchase receipt.
 *
 * This component provides UI and state for selecting a supplier and items (via modals), editing receipt header fields (date, reference, memo),
 * managing receipt line items (quantity, unit cost, tax code, per-line memo), calculating totals (subtotal, tax, grand total),
 * and submitting the composed receipt to the backend. It validates that a supplier is selected and at least one valid line exists before submission,
 * navigates to the created receipt on success, and surfaces errors via alerts.
 *
 * @returns The page component that renders the create-purchase-receipt form and related modals.
 */
export default function CreatePurchaseReceiptPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createReceipt = useCreateReceipt();

    // State
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [referenceNo, setReferenceNo] = useState('');
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<ReceiptLine[]>([]);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);

    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }



    function addLine() {
        setLines([
            ...lines,
            {
                id: generateId(),
                itemId: 0,
                itemSku: '',
                itemName: '',
                qty: 1,
                unitCost: 0,
                taxCode: 'PPN11',
                taxRate: 0.11,
                lineValue: 0,
                lineTax: 0,
                memo: '',
            },
        ]);
    }

    function selectItem(lineId: string, item: Item) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                const unitCost = item.lastCost || item.avgCost || 0;
                const lineValue = 1 * unitCost;
                const lineTax = lineValue * l.taxRate;
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    unitCost,
                    lineValue,
                    lineTax,
                };
            }
            return l;
        }));
    }

    function updateLine(lineId: string, updates: Partial<ReceiptLine>) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                const updated = { ...l, ...updates };
                // Recalculate
                const taxRate = TAX_CODES.find(t => t.code === updated.taxCode)?.rate || 0;
                updated.taxRate = taxRate;
                updated.lineValue = updated.qty * updated.unitCost;
                updated.lineTax = updated.lineValue * taxRate;
                return updated;
            }
            return l;
        }));
    }

    function removeLine(lineId: string) {
        setLines(lines.filter(l => l.id !== lineId));
    }

    // Calculate totals
    const subtotal = lines.reduce((sum, l) => sum + l.lineValue, 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.lineTax, 0);
    const grandTotal = subtotal + taxTotal;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!selectedSupplier) {
            alert('Silakan pilih supplier');
            return;
        }

        const validLines = lines.filter(l => l.itemId && l.qty > 0);
        if (validLines.length === 0) {
            alert('Silakan tambahkan setidaknya satu barang');
            return;
        }

        try {
            const result = await createReceipt.mutateAsync({
                supplierId: selectedSupplier.id,
                receiptDate,
                referenceNo: referenceNo || undefined,
                memo: memo || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId,
                    qty: l.qty,
                    unitCost: l.unitCost,
                    taxCode: l.taxCode,
                    memo: l.memo || undefined,
                })),
            });

            router.push(`/purchases/receipts/${result.id}`);
        } catch (err) {
            alert(`Gagal membuat penerimaan: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
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
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => router.push('/purchases/receipts')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">
                                    <Package size={28} style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }} />
                                    Penerimaan Pembelian Baru
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Catat barang diterima dari supplier
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/purchases/receipts')}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createReceipt.isPending}
                            >
                                {createReceipt.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Simpan Penerimaan
                            </button>
                        </div>
                    </div>

                    {/* Header Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            {/* Supplier Selection */}
                            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Supplier *
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
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Pilih supplier..."
                                        value={selectedSupplier?.name || ''}
                                        readOnly
                                        onClick={() => setIsSupplierModalOpen(true)}
                                        style={{ paddingLeft: 42, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Tanggal Penerimaan *
                                </label>
                                <input
                                    type="date"
                                    value={receiptDate}
                                    onChange={(e) => setReceiptDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    No. Referensi
                                </label>
                                <input
                                    type="text"
                                    value={referenceNo}
                                    onChange={(e) => setReferenceNo(e.target.value)}
                                    placeholder="Surat jalan, dll..."
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Memo
                                </label>
                                <input
                                    type="text"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="Catatan internal..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{
                            padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                Baris Penerimaan
                            </h3>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={addLine}
                            >
                                <Plus size={18} />
                                Tambah Barang
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: 800 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 250 }}>Barang</th>
                                        <th style={{ width: 80, textAlign: 'right' }}>Jml</th>
                                        <th style={{ width: 120, textAlign: 'right' }}>Harga Satuan</th>
                                        <th style={{ width: 100 }}>Pajak</th>
                                        <th style={{ width: 120, textAlign: 'right' }}>Subtotal</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Jml Pajak</th>
                                        <th style={{ width: 150 }}>Memo</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                                                Belum ada barang. Klik &ldquo;Tambah Barang&rdquo; untuk memulai.
                                            </td>
                                        </tr>
                                    ) : (
                                        lines.map((line) => (
                                            <tr key={line.id} style={{ verticalAlign: 'top' }}>
                                                <td style={{ position: 'relative' }}>
                                                    {line.itemId ? (
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>{line.itemName}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{line.itemSku}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ position: 'relative' }}>
                                                            <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                            <input
                                                                type="text"
                                                                placeholder="Pilih barang..."
                                                                value={line.itemName || ''}
                                                                readOnly
                                                                onClick={() => {
                                                                    setActiveLineId(line.id);
                                                                    setIsItemModalOpen(true);
                                                                }}
                                                                style={{ paddingLeft: 36, cursor: 'pointer' }}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={line.qty}
                                                        onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                                                        style={{ textAlign: 'right', width: 70 }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.unitCost}
                                                        onChange={(e) => updateLine(line.id, { unitCost: Number(e.target.value) })}
                                                        style={{ textAlign: 'right', width: 100 }}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        value={line.taxCode}
                                                        onChange={(e) => updateLine(line.id, { taxCode: e.target.value })}
                                                        style={{ width: 90 }}
                                                    >
                                                        {TAX_CODES.map(t => (
                                                            <option key={t.code} value={t.code}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(line.lineValue)}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(line.lineTax)}</td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={line.memo}
                                                        onChange={(e) => updateLine(line.id, { memo: e.target.value })}
                                                        placeholder="..."
                                                        style={{ width: 120 }}
                                                    />
                                                </td>
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
                                        ))
                                    )}
                                </tbody>
                                {lines.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 500 }}>Subtotal</td>
                                            <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(subtotal)}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 500 }}>Pajak</td>
                                            <td className="money" style={{ textAlign: 'right' }}>{formatCurrency(taxTotal)}</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>Total</td>
                                            <td colSpan={3} className="money" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-600)' }}>
                                                {formatCurrency(grandTotal)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </form>
            </main>

            {/* Click outside to close dropdowns */}
            <SelectSupplierModal
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                onSelect={(s) => {
                    setSelectedSupplier(s);
                    setIsSupplierModalOpen(false);
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