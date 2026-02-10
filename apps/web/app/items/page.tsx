'use client';

// =============================================================================
// SAL Accounting System - Items Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { ExportPrintToolbar } from '@/ui/components/export-print-toolbar';
import { useItems } from '@/hooks/use-master-data';
import { formatCurrency, apiPostMultipart } from '@/lib/api-client';
import { exportToExcel, exportToCSV, generateImportTemplate, type ExportColumn } from '@/lib/export-utils';
import { printHTML, generatePrintTable } from '@/lib/print-utils';
import type { Item } from '@/shared/types';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Search,
    Loader2,
    Package,
    Plus,
    X,
    Save,
} from 'lucide-react';
import { useCreateItem } from '@/hooks/use-master-data';
import { Permissions } from '@/shared/constants';

export default function ItemsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [sellableOnly, setSellableOnly] = useState(false);
    const [purchasableOnly, setPurchasableOnly] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data, isLoading, refetch } = useItems({
        search: search || undefined,
        sellableOnly: sellableOnly || undefined,
        purchasableOnly: purchasableOnly || undefined,
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

    const items = data || [];

    // Export column definitions
    const exportColumns: ExportColumn<Item>[] = [
        { header: 'SKU', accessor: 'sku', width: 12 },
        { header: 'Nama', accessor: 'name', width: 25 },
        { header: 'Barcode', accessor: 'barcode', width: 15 },
        { header: 'Nama Kategori', accessor: 'categoryName', width: 15 },
        { header: 'Kode Satuan', accessor: 'uomCode', width: 8 },
        { header: 'Stok', accessor: 'onHand', width: 10 },
        { header: 'Harga Jual', accessor: 'sellingPrice', width: 15 },
        { header: 'Biaya Rata-rata', accessor: 'avgCost', width: 15 },
        { header: 'Kode Pajak', accessor: 'taxCode', width: 10 },
        { header: 'Dapat Dijual', accessor: (row) => row.isSellable ? 'Ya' : 'Tidak', width: 8 },
        { header: 'Dapat Dibeli', accessor: (row) => row.isPurchasable ? 'Ya' : 'Tidak', width: 10 },
        { header: 'Aktif', accessor: (row) => row.isActive ? 'Ya' : 'Tidak', width: 8 },
    ];

    function handleExportExcel() {
        exportToExcel(items, exportColumns, {
            filename: `barang_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Barang',
        });
    }

    function handleExportCSV() {
        exportToCSV(items, exportColumns, {
            filename: `barang_${new Date().toISOString().split('T')[0]}`,
        });
    }

    function handlePrint() {
        const printColumns = [
            { header: 'SKU', accessor: 'sku' as keyof Item },
            { header: 'Nama', accessor: 'name' as keyof Item },
            { header: 'Kategori', accessor: 'categoryName' as keyof Item },
            { header: 'Satuan', accessor: 'uomCode' as keyof Item },
            { header: 'Stok', accessor: (row: Item) => String(row.onHand || 0), className: 'text-right' },
            { header: 'Harga Jual', accessor: (row: Item) => formatCurrency(row.sellingPrice), className: 'money' },
            { header: 'Biaya Rata-rata', accessor: (row: Item) => formatCurrency(row.avgCost), className: 'money' },
            { header: 'Status', accessor: (row: Item) => row.isActive ? 'Aktif' : 'Tidak Aktif' },
        ];

        const html = generatePrintTable(items, printColumns, {
            title: 'Daftar Barang',
            subtitle: search ? `Pencarian: ${search}` : 'Semua Barang',
        });

        printHTML(html, 'Barang');
    }

    function handleDownloadTemplate() {
        generateImportTemplate([
            { header: 'SKU', example: 'ITEM-001' },
            { header: 'Name', example: 'Product Example' },
            { header: 'Barcode', example: '8901234567890' },
            { header: 'Description', example: 'Product description' },
            { header: 'Category ID', example: '1' },
            { header: 'UOM ID', example: '1' },
            { header: 'Selling Price', example: '100000' },
            { header: 'Min Stock', example: '10' },
            { header: 'Tax Code', example: 'PPN' },
            { header: 'Sellable', example: 'Yes' },
            { header: 'Purchasable', example: 'Yes' },
            { header: 'Track Stock', example: 'Yes' },
        ], 'items_import');
    }

    async function handleImport(file: File) {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const promise = apiPostMultipart<{ message: string; errors: string[] }>('/items/import', formData);

        toast.promise(promise, {
            loading: 'Mengimpor barang...',
            success: (data) => {
                queryClient.invalidateQueries({ queryKey: ['master-data', 'items'] });
                if (data.errors && data.errors.length > 0) {
                    console.error('Kesalahan impor:', data.errors);
                    return `${data.message}. Periksa konsol untuk detailnya.`;
                }
                return data.message;
            },
            error: (err) => `Impor gagal: ${err.message}`,
        });
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Barang</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola produk dan layanan Anda
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <ExportPrintToolbar
                            onPrint={handlePrint}
                            onExportExcel={handleExportExcel}
                            onExportCSV={handleExportCSV}
                            onDownloadTemplate={handleDownloadTemplate}
                            onImport={handleImport}
                            showPrint={items.length > 0}
                            showExport={items.length > 0}
                            showImport={hasPermission(Permissions.ITEM_CREATE)}
                        />
                        {hasPermission(Permissions.ITEM_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                Barang Baru
                            </button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Cari barang..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42, width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={sellableOnly}
                                    onChange={(e) => setSellableOnly(e.target.checked)}
                                />
                                Hanya Dijual
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={purchasableOnly}
                                    onChange={(e) => setPurchasableOnly(e.target.checked)}
                                />
                                Hanya Dibeli
                            </label>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
                                Memuat barang...
                            </p>
                        </div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Tidak ada barang ditemukan</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Nama</th>
                                    <th>Kategori</th>
                                    <th>Satuan</th>
                                    <th style={{ textAlign: 'right' }}>Stok</th>
                                    <th style={{ textAlign: 'right' }}>Harga Jual</th>
                                    <th style={{ textAlign: 'right' }}>Biaya Rata-rata</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.sku}</td>
                                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                                        <td>{item.categoryName || '-'}</td>
                                        <td>{item.uomCode}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                            {item.onHand || 0}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                            {formatCurrency(item.sellingPrice)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                            {formatCurrency(item.avgCost)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${item.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                {item.isActive ? 'Aktif' : 'Tidak Aktif'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <CreateItemModal
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

function CreateItemModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const createItem = useCreateItem();
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        barcode: '',
        description: '',
        categoryId: 1, // Default to 1 for now
        uomId: 1, // Default to 1 (PCS) for now
        sellingPrice: 0,
        minStock: 0,
        taxCode: 'NON',
        isSellable: true,
        isPurchasable: true,
        trackInventory: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createItem.mutateAsync({
                ...formData,
                barcode: formData.barcode || undefined,
                description: formData.description || undefined,
                maxStock: undefined,
            });
            onSuccess();
        } catch (err) {
            alert(`Gagal: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Barang Baru</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">SKU *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Barcode</label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Nama *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Deskripsi</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">ID Kategori *</label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">ID Satuan *</label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={formData.uomId}
                                    onChange={e => setFormData({ ...formData, uomId: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">Harga Jual</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.sellingPrice}
                                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Kode Pajak</label>
                                <select
                                    value={formData.taxCode}
                                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                >
                                    <option value="NON">Tanpa Pajak</option>
                                    <option value="PPN">PPN (11%)</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Batas Stok Minimum</label>
                            <input
                                type="number"
                                min={0}
                                value={formData.minStock}
                                onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isSellable}
                                    onChange={e => setFormData({ ...formData, isSellable: e.target.checked })}
                                />
                                Dapat Dijual
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isPurchasable}
                                    onChange={e => setFormData({ ...formData, isPurchasable: e.target.checked })}
                                />
                                Dapat Dibeli
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.trackInventory}
                                    onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })}
                                />
                                Lacak Stok
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn btn-primary" disabled={createItem.isPending}>
                            {createItem.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Simpan Barang
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
