'use client';

// =============================================================================
// SAL Accounting System - Customers Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { ExportPrintToolbar } from '@/ui/components/export-print-toolbar';
import { useCustomers } from '@/hooks/use-master-data';
import { formatCurrency } from '@/lib/api-client';
import { exportToExcel, exportToCSV, generateImportTemplate, type ExportColumn } from '@/lib/export-utils';
import { printHTML, generatePrintTable } from '@/lib/print-utils';
import type { Customer } from '@/shared/types';
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

    const customers = data || [];

    // Export column definitions
    const exportColumns: ExportColumn<Customer>[] = [
        { header: 'Kode', accessor: 'customerCode', width: 12 },
        { header: 'Nama', accessor: 'name', width: 25 },
        { header: 'Email', accessor: 'email', width: 20 },
        { header: 'Telepon', accessor: 'phone', width: 15 },
        { header: 'Alamat Tagihan', accessor: 'billingAddress', width: 30 },
        { header: 'Termin (Hari)', accessor: 'termsDays', width: 12 },
        { header: 'Batas Kredit', accessor: 'creditLimit', width: 15 },
        { header: 'Saldo Saat Ini', accessor: 'currentBalance', width: 15 },
        { header: 'Kode Pajak', accessor: 'taxCode', width: 10 },
        { header: 'NPWP', accessor: 'npwp', width: 18 },
        { header: 'Aktif', accessor: (row) => row.isActive ? 'Ya' : 'Tidak', width: 8 },
    ];

    function handleExportExcel() {
        exportToExcel(customers, exportColumns, {
            filename: `pelanggan_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Pelanggan',
        });
    }

    function handleExportCSV() {
        exportToCSV(customers, exportColumns, {
            filename: `pelanggan_${new Date().toISOString().split('T')[0]}`,
        });
    }

    function handlePrint() {
        const printColumns = [
            { header: 'Kode', accessor: 'customerCode' as keyof Customer },
            { header: 'Nama', accessor: 'name' as keyof Customer },
            { header: 'Email', accessor: 'email' as keyof Customer },
            { header: 'Telepon', accessor: 'phone' as keyof Customer },
            { header: 'Batas Kredit', accessor: (row: Customer) => formatCurrency(row.creditLimit), className: 'money' },
            { header: 'Saldo', accessor: (row: Customer) => formatCurrency(row.currentBalance), className: 'money' },
            { header: 'Status', accessor: (row: Customer) => row.isActive ? 'Aktif' : 'Tidak Aktif' },
        ];

        const html = generatePrintTable(customers, printColumns, {
            title: 'Daftar Pelanggan',
            subtitle: search ? `Pencarian: ${search}` : 'Semua Pelanggan',
        });

        printHTML(html, 'Pelanggan');
    }

    function handleDownloadTemplate() {
        generateImportTemplate([
            { header: 'Name', example: 'PT Contoh Perusahaan' },
            { header: 'Email', example: 'kontak@contoh.com' },
            { header: 'Phone', example: '021-1234567' },
            { header: 'Billing Address', example: 'Jl. Contoh No. 123' },
            { header: 'Shipping Address', example: 'Sama dengan tagihan' },
            { header: 'Terms (Days)', example: '30' },
            { header: 'Credit Limit', example: '10000000' },
            { header: 'Tax Code', example: 'PPN' },
            { header: 'NPWP', example: '12.345.678.9-012.000' },
            { header: 'Notes', example: 'Pelanggan penting' },
        ], 'impor_pelanggan');
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Pelanggan</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola pelanggan Anda
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <ExportPrintToolbar
                            onPrint={handlePrint}
                            onExportExcel={handleExportExcel}
                            onExportCSV={handleExportCSV}
                            onDownloadTemplate={handleDownloadTemplate}
                            showPrint={customers.length > 0}
                            showExport={customers.length > 0}
                            showImport={hasPermission(Permissions.CUSTOMER_CREATE)}
                        />
                        {hasPermission(Permissions.CUSTOMER_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} />
                                Pelanggan Baru
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
                                placeholder="Cari pelanggan..."
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
                                Memuat pelanggan...
                            </p>
                        </div>
                    ) : customers.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Tidak ada pelanggan ditemukan</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Telepon</th>
                                    <th style={{ textAlign: 'right' }}>Batas Kredit</th>
                                    <th style={{ textAlign: 'right' }}>Saldo</th>
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
                                                {customer.isActive ? 'Aktif' : 'Tidak Aktif'}
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
            alert(`Gagal: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Pelanggan Baru</h2>
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
                            <label className="label">Alamat Tagihan</label>
                            <textarea
                                value={formData.billingAddress}
                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
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
                                <label className="label">Batas Kredit</label>
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
                                <label className="label">Kode Pajak</label>
                                <select
                                    value={formData.taxCode}
                                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                >
                                    <option value="NON">Tanpa Pajak</option>
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
                        <button type="submit" className="btn btn-primary" disabled={createCustomer.isPending}>
                            {createCustomer.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Simpan Pelanggan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
