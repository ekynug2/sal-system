'use client';

import { useState, useEffect } from 'react';
import { useCustomers, useSuppliers, useItems } from '@/hooks/use-master-data';
import type { Customer, Supplier, Item } from '@/shared/types';
import { formatCurrency } from '@/lib/api-client';
import { X, Search, Loader2 } from 'lucide-react';

// =============================================================================
// Base Modal
// =============================================================================

interface Column<T> {
    header: string;
    accessor: (item: T) => React.ReactNode;
    width?: string | number;
    align?: 'left' | 'right' | 'center';
}

interface SelectModalProps<T> {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: T) => void;
    data: T[];
    isLoading: boolean;
    columns: Column<T>[];
    searchPlaceholder?: string;
    onSearchChange: (val: string) => void;
}

function SelectModal<T extends { id: number | string }>({
    title,
    isOpen,
    onClose,
    onSelect,
    data,
    isLoading,
    columns,
    searchPlaceholder = 'Cari...',
    onSearchChange,
}: SelectModalProps<T>) {
    const [search, setSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => onSearchChange(search), 300);
        return () => clearTimeout(timer);
    }, [search, onSearchChange]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-primary)',
                width: '100%', maxWidth: '800px',
                maxHeight: '85vh',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h3>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: 'var(--space-2)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{
                            position: 'absolute', left: 12, top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--text-muted)'
                        }} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 42, width: '100%' }}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-500)' }} />
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)' }}>Memuat...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Tidak ada hasil ditemukan
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                                <tr>
                                    {columns.map((col, idx) => (
                                        <th key={idx} style={{
                                            padding: 'var(--space-3)',
                                            textAlign: col.align || 'left',
                                            fontSize: '0.75rem', fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            width: col.width
                                        }}>
                                            {col.header}
                                        </th>
                                    ))}
                                    <th style={{ width: 60 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.id}
                                        onClick={() => onSelect(item)}
                                        style={{
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-color)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {columns.map((col, idx) => (
                                            <td key={idx} style={{
                                                padding: 'var(--space-3)',
                                                textAlign: col.align || 'left',
                                                fontSize: '0.875rem'
                                            }}>
                                                {col.accessor(item)}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-sm btn-primary">Pilih</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Specific Modals
// =============================================================================

export function SelectCustomerModal({ isOpen, onClose, onSelect }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: Customer) => void;
}) {
    const [search, setSearch] = useState('');
    const { data: customers, isLoading } = useCustomers({ search, limit: 50 });

    const columns: Column<Customer>[] = [
        { header: 'Kode', accessor: c => <span style={{ fontFamily: 'var(--font-mono)' }}>{c.customerCode}</span>, width: 100 },
        { header: 'Nama', accessor: c => <span style={{ fontWeight: 500 }}>{c.name}</span> },
        { header: 'Telepon', accessor: c => c.phone || '-' },
        { header: 'Saldo', accessor: c => formatCurrency(0), align: 'right' }, // Placeholder for balance
    ];

    return (
        <SelectModal
            title="Pilih Pelanggan"
            isOpen={isOpen}
            onClose={onClose}
            onSelect={onSelect}
            data={customers || []}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Cari nama atau kode pelanggan..."
            onSearchChange={setSearch}
        />
    );
}

export function SelectSupplierModal({ isOpen, onClose, onSelect }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (supplier: Supplier) => void;
}) {
    const [search, setSearch] = useState('');
    const { data: suppliers, isLoading } = useSuppliers({ search, limit: 50 });

    const columns: Column<Supplier>[] = [
        { header: 'Kode', accessor: s => <span style={{ fontFamily: 'var(--font-mono)' }}>{s.supplierCode}</span>, width: 100 },
        { header: 'Nama', accessor: s => <span style={{ fontWeight: 500 }}>{s.name}</span> },
        { header: 'Telepon', accessor: s => s.phone || '-' },
    ];

    return (
        <SelectModal
            title="Pilih Pemasok"
            isOpen={isOpen}
            onClose={onClose}
            onSelect={onSelect}
            data={suppliers || []}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Cari nama atau kode pemasok..."
            onSearchChange={setSearch}
        />
    );
}

export function SelectItemModal({ isOpen, onClose, onSelect }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: Item) => void;
}) {
    const [search, setSearch] = useState('');
    const { data: items, isLoading } = useItems({ search, limit: 50 });

    const columns: Column<Item>[] = [
        { header: 'SKU', accessor: i => <span style={{ fontFamily: 'var(--font-mono)' }}>{i.sku}</span>, width: 120 },
        { header: 'Nama', accessor: i => <span style={{ fontWeight: 500 }}>{i.name}</span> },
        { header: 'Stok', accessor: i => `${i.onHand || 0} ${i.uomCode}`, align: 'right', width: 100 },
        { header: 'Harga', accessor: i => formatCurrency(i.sellingPrice), align: 'right', width: 120 },
    ];

    return (
        <SelectModal
            title="Pilih Barang"
            isOpen={isOpen}
            onClose={onClose}
            onSelect={onSelect}
            data={items || []}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Cari nama barang atau SKU..."
            onSearchChange={setSearch}
        />
    );
}
