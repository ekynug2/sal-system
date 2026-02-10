'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreateStockOpnameSession } from '@/hooks/use-inventory';
import { SelectItemModal } from '@/ui/components/select-modals';
import type { Item } from '@/shared/types';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Calendar,
    MapPin,
    FileText
} from 'lucide-react';
import { Permissions } from '@/shared/constants';
import { toast } from 'sonner';

/**
 * Page component that renders the "Sesi Stok Opname Baru" UI and manages creating a stock opname session.
 *
 * Renders a form for opname date, optional location, and memo; allows selecting and removing items to be counted;
 * prevents duplicate items; validates that at least one item is selected; submits a create-session mutation and
 * navigates to the created session on success. If the current user lacks the INVENTORY_OPNAME_CREATE permission,
 * displays an access-denied view instead of the form.
 *
 * @returns The page's JSX element that provides the new stock opname session interface.
 */
export default function NewStockOpnamePage() {
    const router = useRouter();
    const { user } = useAuth();
    const createSession = useCreateStockOpnameSession();

    const [formData, setFormData] = useState({
        opnameDate: new Date().toISOString().split('T')[0],
        location: '',
        memo: '',
    });

    const [selectedItems, setSelectedItems] = useState<Item[]>([]);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);

    const handleAddItem = (item: Item) => {
        if (selectedItems.some((i) => i.id === item.id)) {
            toast.error('Barang sudah ditambahkan');
            return;
        }
        setSelectedItems((prev) => [...prev, item]);
        setIsItemModalOpen(false);
        toast.success('Barang ditambahkan');
    };

    const handleRemoveItem = (itemId: number) => {
        setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            toast.error('Harap pilih setidaknya satu barang');
            return;
        }

        try {
            const result = await createSession.mutateAsync({
                opnameDate: formData.opnameDate,
                location: formData.location,
                memo: formData.memo,
                itemIds: selectedItems.map((i) => i.id),
            });

            toast.success('Sesi stok opname dibuat');
            router.push(`/inventory/opname/${result.id}`);
        } catch (error) {
            console.error(error);
            toast.error('Gagal membuat sesi');
        }
    };

    if (!user?.permissions.includes(Permissions.INVENTORY_OPNAME_CREATE)) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <h3>Akses Ditolak</h3>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <button className="btn btn-secondary" onClick={() => router.back()}>
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="page-title">Sesi Stok Opname Baru</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Mulai sesi perhitungan stok baru</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button className="btn btn-secondary" onClick={() => router.back()}>
                            Batal
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={createSession.isPending}
                        >
                            {createSession.isPending ? (
                                <>Menyimpan...</>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Buat Sesi
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="form-grid">
                    {/* Header Info */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Detail Sesi</h3>
                        <div className="form-group">
                            <label>Tanggal Opname</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="date"
                                    value={formData.opnameDate}
                                    onChange={(e) => setFormData({ ...formData, opnameDate: e.target.value })}
                                    style={{ paddingLeft: 42 }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Lokasi (Opsional)</label>
                            <div style={{ position: 'relative' }}>
                                <MapPin size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="contoh: Gudang A, Rak 1-5"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    style={{ paddingLeft: 42 }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Memo</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                <textarea
                                    placeholder="Tambahkan catatan..."
                                    value={formData.memo}
                                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                                    style={{ paddingLeft: 42, minHeight: 100 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                            <h3 className="card-title">Barang yang Dihitung</h3>
                            <button className="btn btn-secondary" onClick={() => setIsItemModalOpen(true)}>
                                <Plus size={18} />
                                Tambah Barang
                            </button>
                        </div>

                        {selectedItems.length === 0 ? (
                            <div style={{ padding: 'var(--space-8)', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ color: 'var(--text-muted)' }}>Tidak ada barang dipilih. Tambahkan barang untuk dihitung.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Nama Barang</th>
                                            <th className="text-right">Stok Sistem Saat Ini</th>
                                            <th style={{ width: 60 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ fontFamily: 'var(--font-mono)' }}>{item.sku}</td>
                                                <td style={{ fontWeight: 500 }}>{item.name}</td>
                                                <td className="text-right">{item.onHand || 0} {item.uomCode}</td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ color: 'var(--accent-red)', padding: 'var(--space-1)' }}
                                                        onClick={() => handleRemoveItem(item.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <SelectItemModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSelect={handleAddItem}
            />
        </div>
    );
}