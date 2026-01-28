'use client';

// =============================================================================
// SAL Accounting System - Journal Entries Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useJournalEntries, useCreateJournalEntry, useChartOfAccounts } from '@/hooks/use-accounting';
import { formatCurrency, formatDate } from '@/lib/api-client';
import type { JournalEntry } from '@/shared/types';
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    BookOpen,
    Eye,
    X,
    Save,
    Trash2,
} from 'lucide-react';
import { Permissions } from '@/shared/constants';

// Source type labels
const sourceTypeLabels: Record<string, string> = {
    MANUAL: 'Manual Entry',
    SALES_INVOICE: 'Sales Invoice',
    PURCHASE_BILL: 'Purchase Bill',
    SALES_PAYMENT: 'Sales Payment',
    PURCHASE_PAYMENT: 'Purchase Payment',
    INVENTORY_ADJ: 'Inventory Adjustment',
    SALES_CREDIT_NOTE: 'Credit Note',
};

export default function JournalEntriesPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();
    const [page, setPage] = useState(1);
    const [sourceType, setSourceType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data, isLoading, refetch } = useJournalEntries({
        page,
        limit: 20,
        sourceType: sourceType || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
    });

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

    const entries = data?.data || [];
    const total = data?.meta?.total || 0;
    const totalPages = data?.meta?.totalPages || Math.ceil(total / 20);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Journal Entries</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            View all accounting journal entries
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {hasPermission(Permissions.JOURNAL_MANUAL_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                Manual Entry
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From:</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{ width: 150 }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To:</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{ width: 150 }}
                            />
                        </div>
                        <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value)}
                            style={{ width: 180 }}
                        >
                            <option value="">All Sources</option>
                            <option value="MANUAL">Manual Entry</option>
                            <option value="SALES_INVOICE">Sales Invoice</option>
                            <option value="PURCHASE_BILL">Purchase Bill</option>
                            <option value="SALES_PAYMENT">Sales Payment</option>
                            <option value="PURCHASE_PAYMENT">Purchase Payment</option>
                            <option value="INVENTORY_ADJ">Inventory Adjustment</option>
                        </select>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                                setSourceType('');
                                setPage(1);
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
                                Loading entries...
                            </p>
                        </div>
                    ) : entries.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No journal entries found</p>
                        </div>
                    ) : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 120 }}>Entry No</th>
                                        <th style={{ width: 100 }}>Date</th>
                                        <th style={{ width: 150 }}>Source</th>
                                        <th>Memo</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Debit</th>
                                        <th style={{ width: 140, textAlign: 'right' }}>Credit</th>
                                        <th style={{ width: 60 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map(entry => (
                                        <tr key={entry.id}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                                                {entry.entryNo}
                                            </td>
                                            <td>{formatDate(entry.entryDate)}</td>
                                            <td>
                                                <span className={`badge ${entry.isManual ? 'badge-info' : 'badge-secondary'}`}>
                                                    {sourceTypeLabels[entry.sourceType] || entry.sourceType}
                                                </span>
                                            </td>
                                            <td style={{ color: entry.memo ? 'inherit' : 'var(--text-muted)' }}>
                                                {entry.memo || '-'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                                {formatCurrency(entry.totalDebit)}
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                                {formatCurrency(entry.totalCredit)}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => setSelectedEntry(entry)}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div style={{
                                padding: 'var(--space-4)',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} of {total}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-3)' }}>
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Detail Modal */}
                {selectedEntry && (
                    <JournalDetailModal
                        entry={selectedEntry}
                        onClose={() => setSelectedEntry(null)}
                    />
                )}

                {/* Create Manual Entry Modal */}
                {showCreateModal && (
                    <CreateJournalModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            refetch();
                        }}
                    />
                )}
            </main>
        </div>
    );
}

// Journal Detail Modal
function JournalDetailModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <h2>Journal Entry: {entry.entryNo}</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entry Date</div>
                            <div style={{ fontWeight: 500 }}>{formatDate(entry.entryDate)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Source</div>
                            <div style={{ fontWeight: 500 }}>
                                {sourceTypeLabels[entry.sourceType] || entry.sourceType}
                                {entry.sourceId && ` #${entry.sourceId}`}
                            </div>
                        </div>
                        {entry.memo && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Memo</div>
                                <div>{entry.memo}</div>
                            </div>
                        )}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th style={{ width: 140, textAlign: 'right' }}>Debit</th>
                                <th style={{ width: 140, textAlign: 'right' }}>Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entry.lines.map((line, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <span style={{ fontFamily: 'var(--font-mono)', marginRight: 8 }}>
                                            {line.accountCode}
                                        </span>
                                        {line.accountName}
                                        {line.memo && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {line.memo}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                        {line.dc === 'D' ? formatCurrency(line.amount) : '-'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                        {line.dc === 'C' ? formatCurrency(line.amount) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                <td>Total</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                    {formatCurrency(entry.totalDebit)}
                                </td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                    {formatCurrency(entry.totalCredit)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// Create Manual Journal Entry Modal
function CreateJournalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const createJournal = useCreateJournalEntry();
    const { data: accounts } = useChartOfAccounts({ flat: true, activeOnly: true });

    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [memo, setMemo] = useState('');
    const [lines, setLines] = useState<{ id: number; accountId: string; dc: 'D' | 'C'; amount: number; memo: string }[]>([
        { id: 1, accountId: '', dc: 'D', amount: 0, memo: '' },
        { id: 2, accountId: '', dc: 'C', amount: 0, memo: '' },
    ]);

    const postableAccounts = (accounts || []).filter(a => !a.isHeader);

    const addLine = () => {
        setLines([...lines, { id: Date.now(), accountId: '', dc: 'D', amount: 0, memo: '' }]);
    };

    const removeLine = (id: number) => {
        if (lines.length > 2) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const updateLine = (id: number, field: string, value: string | number) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const totalDebit = lines.filter(l => l.dc === 'D').reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = lines.filter(l => l.dc === 'C').reduce((sum, l) => sum + l.amount, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isBalanced) {
            alert('Journal entry must be balanced (Debits = Credits)');
            return;
        }

        const validLines = lines.filter(l => l.accountId && l.amount > 0);
        if (validLines.length < 2) {
            alert('At least two lines are required');
            return;
        }

        try {
            await createJournal.mutateAsync({
                entryDate,
                memo: memo || undefined,
                lines: validLines.map(l => ({
                    accountId: Number(l.accountId),
                    dc: l.dc,
                    amount: l.amount,
                    memo: l.memo || undefined,
                })),
            });
            onSuccess();
        } catch (err) {
            alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
                <div className="modal-header">
                    <h2>Create Manual Journal Entry</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)' }}>
                            <div>
                                <label className="label">Entry Date *</label>
                                <input
                                    type="date"
                                    required
                                    value={entryDate}
                                    onChange={e => setEntryDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label">Memo</label>
                                <input
                                    type="text"
                                    value={memo}
                                    onChange={e => setMemo(e.target.value)}
                                    placeholder="Description of this journal entry..."
                                />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 300 }}>Account</th>
                                        <th style={{ width: 80 }}>D/C</th>
                                        <th style={{ width: 140 }}>Amount</th>
                                        <th>Line Memo</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map(line => (
                                        <tr key={line.id}>
                                            <td>
                                                <select
                                                    value={line.accountId}
                                                    onChange={e => updateLine(line.id, 'accountId', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select account...</option>
                                                    {postableAccounts.map(a => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.accountCode} - {a.accountName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <select
                                                    value={line.dc}
                                                    onChange={e => updateLine(line.id, 'dc', e.target.value as 'D' | 'C')}
                                                >
                                                    <option value="D">Debit</option>
                                                    <option value="C">Credit</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={line.amount}
                                                    onChange={e => updateLine(line.id, 'amount', Number(e.target.value))}
                                                    style={{ textAlign: 'right' }}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={line.memo}
                                                    onChange={e => updateLine(line.id, 'memo', e.target.value)}
                                                    placeholder="Optional..."
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => removeLine(line.id)}
                                                    disabled={lines.length <= 2}
                                                    style={{ color: 'var(--accent-red)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <td>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
                                                <Plus size={16} /> Add Line
                                            </button>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {isBalanced ? (
                                                <span style={{ color: 'var(--accent-green)' }}>✓ Balanced</span>
                                            ) : (
                                                <span style={{ color: 'var(--accent-red)' }}>✗ Unbalanced</span>
                                            )}
                                        </td>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>
                                            <div>Debit: <strong>{formatCurrency(totalDebit)}</strong></div>
                                            <div>Credit: <strong>{formatCurrency(totalCredit)}</strong></div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createJournal.isPending || !isBalanced}
                        >
                            {createJournal.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Create Entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
