'use client';

// =============================================================================
// SAL Accounting System - Items Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useItems } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
// ... imports ...
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

    const items = data?.data || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Items</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Manage your products and services
                        </p>
                    </div>
                    <div>
                        {hasPermission(Permissions.ITEM_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                New Item
                            </button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search items..."
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
                                Sellable Only
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={purchasableOnly}
                                    onChange={(e) => setPurchasableOnly(e.target.checked)}
                                />
                                Purchasable Only
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
                                Loading items...
                            </p>
                        </div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No items found</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>UOM</th>
                                    <th style={{ textAlign: 'right' }}>On Hand</th>
                                    <th style={{ textAlign: 'right' }}>Sell Price</th>
                                    <th style={{ textAlign: 'right' }}>Avg Cost</th>
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
                                                {item.isActive ? 'Active' : 'Inactive'}
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
            alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>New Item</h2>
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
                            <label className="label">Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">Category ID *</label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={formData.categoryId}
                                    onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">UOM ID *</label>
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
                                <label className="label">Selling Price</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.sellingPrice}
                                    onChange={e => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Tax Code</label>
                                <select
                                    value={formData.taxCode}
                                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                >
                                    <option value="NON">Non-Taxable</option>
                                    <option value="PPN">PPN (11%)</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Min Stock Level</label>
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
                                Sellable
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isPurchasable}
                                    onChange={e => setFormData({ ...formData, isPurchasable: e.target.checked })}
                                />
                                Purchasable
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.trackInventory}
                                    onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })}
                                />
                                Track Stock
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={createItem.isPending}>
                            {createItem.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
