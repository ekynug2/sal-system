'use client';

// =============================================================================
// SAL Accounting System - Customers Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCustomers } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
// ... imports ...
import {
    Search,
    Loader2,
    Users,
    Plus,
    X,
    Save,
} from 'lucide-react';
import { useCreateCustomer } from '@/hooks/use-master-data';
import { Permissions } from '@/shared/constants';

export default function CustomersPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data, isLoading, refetch } = useCustomers({
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

    const customers = data?.data || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Customers</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Manage your customers
                        </p>
                    </div>
                    <div>
                        {hasPermission(Permissions.CUSTOMER_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                New Customer
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
                                placeholder="Search customers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42, width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Customers Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
                                Loading customers...
                            </p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No customers found</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th style={{ textAlign: 'right' }}>Credit Limit</th>
                                    <th style={{ textAlign: 'right' }}>Balance</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(customer => (
                                    <tr key={customer.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)' }}>{customer.customerCode}</td>
                                        <td style={{ fontWeight: 500 }}>{customer.name}</td>
                                        <td>{customer.email || '-'}</td>
                                        <td>{customer.phone || '-'}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                            {formatCurrency(customer.creditLimit)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: customer.currentBalance > 0 ? 'var(--accent-red)' : 'inherit' }}>
                                            {formatCurrency(customer.currentBalance)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${customer.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                {customer.isActive ? 'Active' : 'Inactive'}
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
                    <CreateCustomerModal
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

function CreateCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const createCustomer = useCreateCustomer();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        billingAddress: '',
        shippingAddress: '',
        termsDays: 0,
        creditLimit: 0,
        taxCode: 'NON',
        npwp: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCustomer.mutateAsync({
                ...formData,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                billingAddress: formData.billingAddress || undefined,
                shippingAddress: formData.shippingAddress || undefined,
                npwp: formData.npwp || undefined,
                notes: formData.notes || undefined,
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
                    <h2>New Customer</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="label">Name *</label>
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
                                <label className="label">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Billing Address</label>
                            <textarea
                                value={formData.billingAddress}
                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="label">Terms (Days)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.termsDays}
                                    onChange={e => setFormData({ ...formData, termsDays: Number(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Credit Limit</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={formData.creditLimit}
                                    onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
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
                            <div className="form-group">
                                <label className="label">NPWP</label>
                                <input
                                    type="text"
                                    value={formData.npwp}
                                    onChange={e => setFormData({ ...formData, npwp: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={createCustomer.isPending}>
                            {createCustomer.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Customer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
