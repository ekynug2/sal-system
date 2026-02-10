'use client';

// =============================================================================
// SAL Accounting System - Create Inventory Adjustment
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { SelectItemModal } from '@/ui/components/select-modals';
import { useCreateAdjustment } from '@/hooks/use-inventory';
import { useItems } from '@/hooks/use-master-data';
import { Item } from '@/shared/types';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Loader2,
    Search,
} from 'lucide-react';

interface AdjLine {
    id: string;
    itemId: number | null;
    itemSku: string;
    itemName: string;
    currentQty: number;
    qtyDelta: number;
    reasonCode: string;
    memo: string;
}

const REASON_CODES = [
    { code: 'DAMAGED', label: 'Rusak' },
    { code: 'EXPIRED', label: 'Kedaluwarsa' },
    { code: 'LOST', label: 'Hilang' },
    { code: 'FOUND', label: 'Ditemukan' },
    { code: 'INPUT_ERROR', label: 'Kesalahan Entri Data' },
    { code: 'OTHER', label: 'Lainnya' },
];

/**
 * Generates a short random alphanumeric identifier.
 *
 * @returns A 7-character lowercase alphanumeric string
 */
function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Page component rendering the "Create Inventory Adjustment" UI, allowing users to add/remove adjustment lines,
 * select items, set adjustment quantities and reasons, and submit a manual inventory adjustment.
 *
 * If the user is not authenticated this component redirects to the login page. Submitting a valid form creates
 * an adjustment and navigates to the created adjustment's detail page.
 *
 * @returns The React element for the create-adjustment page.
 */
export default function CreateAdjustmentPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createAdjustment = useCreateAdjustment();

    // Master Data
    const { data: itemsData, isLoading: itemsLoading } = useItems({ sellableOnly: false }); // All items
    const items = itemsData || [];

    // State
    const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<AdjLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', currentQty: 0, qtyDelta: 0, reasonCode: 'OTHER', memo: '' }
    ]);

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [activeLineId, setActiveLineId] = useState<string | null>(null);

    // Initial load
    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }

    function addLine() {
        setLines([
            ...lines,
            { id: generateId(), itemId: null, itemSku: '', itemName: '', currentQty: 0, qtyDelta: 0, reasonCode: 'OTHER', memo: '' }
        ]);
    }

    function removeLine(id: string) {
        if (lines.length > 1) {
            setLines(lines.filter(l => l.id !== id));
        }
    }

    function updateLine(id: string, field: keyof AdjLine, value: string | number | null) {
        setLines(lines.map(l => {
            if (l.id === id) {
                return { ...l, [field]: value };
            }
            return l;
        }));
    }

    function selectItem(lineId: string, item: Item) {
        setLines(lines.map(l => {
            if (l.id === lineId) {
                return {
                    ...l,
                    itemId: item.id,
                    itemSku: item.sku,
                    itemName: item.name,
                    currentQty: item.onHand || 0,
                    qtyDelta: 0,
                };
            }
            return l;
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validLines = lines.filter(l => l.itemId && l.qtyDelta !== 0);
        if (validLines.length === 0) {
            alert('Harap tambahkan setidaknya satu barang dengan jumlah penyesuaian tidak nol');
            return;
        }

        try {
            const result = await createAdjustment.mutateAsync({
                adjDate,
                adjustmentType: 'MANUAL',
                memo: memo || undefined,
                lines: validLines.map(l => ({
                    itemId: l.itemId!,
                    qtyDelta: l.qtyDelta,
                    reasonCode: l.reasonCode,
                    memo: l.memo || undefined,
                })),
            });

            router.push(`/inventory/adjustments/${result.id}`);
        } catch (err) {
            alert(`Gagal membuat penyesuaian: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
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
                                onClick={() => router.push('/inventory/adjustments')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">Penyesuaian Persediaan Baru</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Sesuaikan level stok secara manual
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/inventory/adjustments')}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createAdjustment.isPending}
                            >
                                {createAdjustment.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Simpan Penyesuaian
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Tanggal *
                                </label>
                                <input
                                    type="date"
                                    value={adjDate}
                                    onChange={(e) => setAdjDate(e.target.value)}
                                    required
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
                                    placeholder="Alasan penyesuaian..."
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
                                Baris Penyesuaian
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
                                        <th style={{ width: 100, textAlign: 'right' }}>Qty Saat Ini</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Qty Penyesuaian (+/-)</th>
                                        <th style={{ width: 160 }}>Kode Alasan</th>
                                        <th style={{ width: 200 }}>Memo</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line) => (
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
                                                        style={{
                                                            paddingLeft: 36,
                                                            cursor: 'pointer',
                                                            border: !line.itemId ? '1px solid var(--accent-red)' : undefined
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {line.itemId ? line.currentQty : '-'}
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={line.qtyDelta}
                                                    onChange={(e) => updateLine(line.id, 'qtyDelta', Number(e.target.value))}
                                                    style={{ textAlign: 'right', fontWeight: 600 }}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={line.reasonCode}
                                                    onChange={(e) => updateLine(line.id, 'reasonCode', e.target.value)}
                                                    style={{ width: '100%' }}
                                                >
                                                    {REASON_CODES.map(r => (
                                                        <option key={r.code} value={r.code}>{r.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={line.memo}
                                                    onChange={(e) => updateLine(line.id, 'memo', e.target.value)}
                                                    placeholder="Catatan opsional"
                                                />
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>
            </main>

            {/* Item Selection Modal */}
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