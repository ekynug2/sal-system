'use client';

// =============================================================================
// SAL Accounting System - Create Inventory Adjustment
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreateAdjustment } from '@/hooks/use-inventory';
import { useItems } from '@/hooks/use-master-data';
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
    { code: 'DAMAGED', label: 'Damaged' },
    { code: 'EXPIRED', label: 'Expired' },
    { code: 'LOST', label: 'Lost' },
    { code: 'FOUND', label: 'Found' },
    { code: 'INPUT_ERROR', label: 'Data Entry Error' },
    { code: 'OTHER', label: 'Other' },
];

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export default function CreateAdjustmentPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const createAdjustment = useCreateAdjustment();

    // Master Data
    const { data: itemsData, isLoading: itemsLoading } = useItems({ sellableOnly: false }); // All items
    const items = itemsData?.data || [];

    // State
    const [adjDate, setAdjDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<AdjLine[]>([
        { id: generateId(), itemId: null, itemSku: '', itemName: '', currentQty: 0, qtyDelta: 0, reasonCode: 'OTHER', memo: '' }
    ]);

    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState<string | null>(null);

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

    function selectItem(lineId: string, item: { id: number; sku: string; name: string; onHand?: number }) {
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
        setShowItemDropdown(null);
        setItemSearch('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validLines = lines.filter(l => l.itemId && l.qtyDelta !== 0);
        if (validLines.length === 0) {
            alert('Please add at least one item with non-zero adjustment quantity');
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
            alert(`Failed to create adjustment: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    const filteredItems = items.filter(item =>
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
                                onClick={() => router.push('/inventory/adjustments')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">New Inventory Adjustment</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Manually adjust stock levels
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/inventory/adjustments')}
                            >
                                Cancel
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
                                Save Adjustment
                            </button>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Date *
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
                                    placeholder="Reason for adjustment..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                Adjustment Lines
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
                                        <th style={{ width: 100, textAlign: 'right' }}>Current Qty</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Qty to Adjust (+/-)</th>
                                        <th style={{ width: 160 }}>Reason Code</th>
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
                                                            top: 12,
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
                                                        onFocus={() => {
                                                            setItemSearch('');
                                                            setShowItemDropdown(line.id);
                                                        }}
                                                        style={{ paddingLeft: 36 }}
                                                        autoComplete="off"
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
                                                                maxHeight: 250,
                                                                overflowY: 'auto',
                                                            }}
                                                        >
                                                            {itemsLoading ? (
                                                                <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>Loading...</div>
                                                            ) : filteredItems.length === 0 ? (
                                                                <div style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                                    No items found
                                                                </div>
                                                            ) : (
                                                                filteredItems.map(item => (
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
                                                                            <span>OnHand: {item.onHand} {item.uomCode}</span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
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
                                                    placeholder="Optional note"
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
