'use client';

// =============================================================================
// SAL Accounting System - Suppliers Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useSuppliers } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
// ... imports ...
import {
    Search,
    Loader2,
    Truck,
    Plus,
    X,
    Save,
} from 'lucide-react';
import { useCreateSupplier } from '@/hooks/use-master-data';
import { Permissions } from '@/shared/constants';

/**
 * Render the Suppliers page: displays a searchable list of suppliers, handles authentication state,
 * and provides a permission-gated "Create Supplier" modal that refetches the list on success.
 *
 * The component shows an auth loader while authentication is in progress and redirects to `/login`
 * if no authenticated user is present. The "Pemasok Baru" action is displayed only when the user
 * has the supplier create permission.
 *
 * @returns The rendered Suppliers page as a JSX element
 */
export default function SuppliersPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data, isLoading, refetch } = useSuppliers({
        search: search || undefined,
        activeOnly: false,
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

    const suppliers = data || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Pemasok</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola pemasok Anda
                        </p>
                    </div>
                    <div>
                        {hasPermission(Permissions.SUPPLIER_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                Pemasok Baru
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
                                placeholder="Cari pemasok..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42, width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Suppliers Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
                                Memuat pemasok...
                            </p>
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Truck size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Tidak ada pemasok ditemukan</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Telepon</th>
                                    <th style={{ textAlign: 'right' }}>Saldo</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(supplier => (
                                    <tr key={supplier.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{supplier.supplierCode}</td>
                                        <td style={{ fontWeight: 500 }}>{supplier.name}</td>
                                        <td>{supplier.email || '-'}</td>
                                        <td>{supplier.phone || '-'}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: supplier.currentBalance > 0 ? 'var(--accent-red)' : 'inherit' }}>
                                            {formatCurrency(supplier.currentBalance)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${supplier.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                {supplier.isActive ? 'Aktif' : 'Tidak Aktif'}
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
                    <CreateSupplierModal
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

/**
 * Render a modal containing a form to create a new supplier.
 *
 * The form requires a supplier name and accepts optional contact, address, payment terms,
 * tax code, NPWP, and notes. Submitting the form creates the supplier; onSuccess is called
 * when creation succeeds and onClose is called to close the modal.
 *
 * @param onClose - Callback invoked to close the modal
 * @param onSuccess - Callback invoked after a supplier is successfully created
 * @returns The modal React element for creating a supplier
 */
function CreateSupplierModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const createSupplier = useCreateSupplier();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        termsDays: 0,
        taxCode: 'NON',
        npwp: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSupplier.mutateAsync({
                ...formData,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                npwp: formData.npwp || undefined,
                notes: formData.notes || undefined,
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
                    <h2>Pemasok Baru</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="label">Nama *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Telepon</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Alamat</label>
                            <textarea
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">Termin (Hari)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.termsDays}
                                    onChange={e => setFormData({ ...formData, termsDays: Number(e.target.value) })}
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
                            <label className="label">NPWP</label>
                            <input
                                type="text"
                                value={formData.npwp}
                                onChange={e => setFormData({ ...formData, npwp: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Catatan</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn btn-primary" disabled={createSupplier.isPending}>
                            {createSupplier.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Simpan Pemasok
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}