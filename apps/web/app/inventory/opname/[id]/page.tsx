'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import {
    useStockOpnameSession,
    useUpdateOpnameItems,
    useSubmitOpnameSession,
    usePostOpnameSession
} from '@/hooks/use-inventory';
import {
    ArrowLeft,
    Save,
    CheckCircle,
    Archive,
    Loader2,
    AlertTriangle,
    Calendar,
    MapPin,
    FileText as FileTextIcon
} from 'lucide-react';
import { formatDate } from '@/lib/api-client';
import { Permissions } from '@/shared/constants';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
    OPEN: 'badge-draft',
    COUNTING: 'badge-partial',
    SUBMITTED: 'badge-posted',
    POSTED: 'badge-paid',
    CANCELLED: 'badge-voided',
};

/**
 * Displays and manages a stock opname session detail page, including session metadata, an items table with editable counted quantities and notes, and actions to save progress, submit the session, or post inventory adjustments.
 *
 * @param params - A promise resolving to route parameters; must include `id` (string) identifying the opname session.
 * @returns The React element for the stock opname detail page with loading, error, and interactive editing states.
 */
export default function StockOpnameDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const sessionId = parseInt(id);
    const router = useRouter();
    const { user } = useAuth();

    // Hooks
    const { data: session, isLoading, error, refetch } = useStockOpnameSession(sessionId);
    const updateItems = useUpdateOpnameItems();
    const submitSession = useSubmitOpnameSession();
    const postSession = usePostOpnameSession();

    // Local state for editing
    const [counts, setCounts] = useState<Record<number, number | string>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Initialize local state when session loads
    useEffect(() => {
        if (session?.items) {
            const initialCounts: Record<number, number | string> = {};
            const initialNotes: Record<number, string> = {};

            session.items.forEach(item => {
                if (item.countedQty !== undefined && item.countedQty !== null) {
                    initialCounts[item.itemId] = item.countedQty;
                } else {
                    initialCounts[item.itemId] = ''; // Empty string for uncounted
                }
                if (item.notes) {
                    initialNotes[item.itemId] = item.notes;
                }
            });

            setCounts(initialCounts);
            setNotes(initialNotes);
            setHasUnsavedChanges(false);
        }
    }, [session]);

    // Handlers
    const handleCountChange = (itemId: number, value: string) => {
        setCounts(prev => ({ ...prev, [itemId]: value }));
        setHasUnsavedChanges(true);
    };

    const handleNoteChange = (itemId: number, value: string) => {
        setNotes(prev => ({ ...prev, [itemId]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        if (!session) return;

        const itemsToUpdate = session.items.map(item => {
            const val = counts[item.itemId];
            if (val === '' || val === undefined) return null;
            return {
                itemId: item.itemId,
                countedQty: Number(val),
                notes: notes[item.itemId]
            };
        }).filter(Boolean) as { itemId: number, countedQty: number, notes?: string }[];

        if (itemsToUpdate.length === 0) {
            toast.info('Tidak ada barang terhitung untuk disimpan');
            return;
        }

        try {
            await updateItems.mutateAsync({
                id: sessionId,
                items: itemsToUpdate
            });
            toast.success('Progres disimpan');
            setHasUnsavedChanges(false);
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan progres');
        }
    };

    const handleSubmit = async () => {
        if (hasUnsavedChanges) {
            toast.warning('Simpan perubahan Anda terlebih dahulu');
            return;
        }

        if (!confirm('Apakah Anda yakin ingin mengirim sesi ini? Tidak ada perubahan lebih lanjut yang dapat dilakukan.')) return;

        try {
            await submitSession.mutateAsync(sessionId);
            toast.success('Sesi berhasil dikirim');
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengirim sesi');
        }
    };

    const handlePost = async () => {
        if (!confirm('Apakah Anda yakin ingin mem-POSTING sesi ini? Ini akan menyesuaikan stok persediaan.')) return;

        try {
            await postSession.mutateAsync(sessionId);
            toast.success('Persediaan berhasil disesuaikan');
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Gagal memposting sesi');
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Sesi Tidak Ditemukan</h3>
                        <button className="btn btn-secondary mt-4" onClick={() => router.push('/inventory/opname')}>
                            Kembali ke Daftar
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const isEditable = session.status === 'OPEN' || session.status === 'COUNTING';
    const isSubmitted = session.status === 'SUBMITTED';

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <button className="btn btn-secondary" onClick={() => router.push('/inventory/opname')}>
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <h1 className="page-title">Sesi #{session.sessionNo}</h1>
                                <span className={`badge ${statusColors[session.status]}`}>
                                    {session.status}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {formatDate(session.opnameDate)} • {session.items.length} Barang untuk Dihitung
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        {isEditable && (
                            <>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleSave}
                                    disabled={updateItems.isPending}
                                    style={{ position: 'relative' }}
                                >
                                    <Save size={18} />
                                    Simpan Progres
                                    {hasUnsavedChanges && (
                                        <span style={{
                                            position: 'absolute', top: -4, right: -4,
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: 'var(--accent-red)'
                                        }} />
                                    )}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={submitSession.isPending || hasUnsavedChanges}
                                >
                                    <CheckCircle size={18} />
                                    Kirim Sesi
                                </button>
                            </>
                        )}
                        {isSubmitted && user?.permissions.includes(Permissions.INVENTORY_OPNAME_POST) && (
                            <button
                                className="btn btn-primary"
                                onClick={handlePost}
                                disabled={postSession.isPending}
                            >
                                <Archive size={18} />
                                Posting Penyesuaian
                            </button>
                        )}
                    </div>
                </div>

                <div className="form-grid">
                    {/* Details */}
                    <div className="card">
                        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Calendar size={14} /> Tanggal
                                </label>
                                <div style={{ fontWeight: 500 }}>{formatDate(session.opnameDate)}</div>
                            </div>
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <MapPin size={14} /> Lokasi
                                </label>
                                <div style={{ fontWeight: 500 }}>{session.location || '-'}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <FileTextIcon size={14} /> Memo
                                </label>
                                <div style={{ fontWeight: 500 }}>{session.memo || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>SKU</th>
                                        <th>Nama Barang</th>
                                        <th className="text-right">Qty Sistem (Snapshot)</th>
                                        <th className="text-right" style={{ width: 150 }}>Qty Terhitung</th>
                                        <th className="text-right">Selisih</th>
                                        <th>Catatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {session.items.map((item) => {
                                        const currentVal = counts[item.itemId];
                                        const numVal = currentVal === '' ? undefined : Number(currentVal);
                                        const variance = numVal !== undefined ? numVal - item.systemQty : undefined;

                                        return (
                                            <tr key={item.itemId}>
                                                <td style={{ fontFamily: 'var(--font-mono)' }}>{item.itemSku}</td>
                                                <td style={{ fontWeight: 500 }}>{item.itemName}</td>
                                                <td className="text-right">{item.systemQty}</td>
                                                <td className="text-right">
                                                    {isEditable ? (
                                                        <input
                                                            type="number"
                                                            className={`text-right ${numVal !== undefined && variance !== 0 ? 'input-warning' : ''}`}
                                                            value={currentVal}
                                                            onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                                                            placeholder="0"
                                                            style={{ width: '100%' }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontWeight: 600 }}>{item.countedQty ?? '-'}</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    {variance !== undefined ? (
                                                        <span style={{
                                                            color: variance === 0 ? 'var(--text-secondary)' : variance < 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                                                            fontWeight: 600
                                                        }}>
                                                            {variance > 0 ? '+' : ''}{variance}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {isEditable ? (
                                                        <input
                                                            type="text"
                                                            value={notes[item.itemId] || ''}
                                                            onChange={(e) => handleNoteChange(item.itemId, e.target.value)}
                                                            placeholder="Catatan..."
                                                        />
                                                    ) : (
                                                        item.notes || '-'
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}