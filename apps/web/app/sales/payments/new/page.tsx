'use client';

// =============================================================================
// SAL Accounting System - Receive Payment Page
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { SelectCustomerModal } from '@/ui/components/select-modals';
import { useReceivePayment, useUnpaidInvoices } from '@/hooks/use-sales';
import { useCustomers } from '@/hooks/use-master-data';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    ArrowLeft,
    Save,
    Loader2,
    Search,
} from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'CASH', label: 'Tunai' },
    { id: 'BANK_TRANSFER', label: 'Transfer Bank' },
    { id: 'CHECK', label: 'Cek / Giro' },
    { id: 'QRIS', label: 'QRIS / E-Money' },
    { id: 'OTHER', label: 'Lainnya' },
];

export default function ReceivePaymentPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    // Hooks
    const receivePayment = useReceivePayment();
    const { data: customersData, isLoading: custLoading } = useCustomers({ activeOnly: true });

    //State
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
    const [amountReceived, setAmountReceived] = useState<number>(0);
    const [referenceNo, setReferenceNo] = useState('');
    const [memo, setMemo] = useState('');
    const [allocations, setAllocations] = useState<Record<number, number>>({});
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Fetch unpaid invoices when customer selected
    const { data: unpaidInvoices, isLoading: invoicesLoading } = useUnpaidInvoices(customerId);

    // Helper for auto-allocation
    function autoAllocate(amount: number, invoices: typeof unpaidInvoices) {
        if (!invoices || amount <= 0) return {};

        let remaining = amount;
        const newAllocations: Record<number, number> = {};

        for (const inv of invoices) {
            if (remaining <= 0) break;
            const allocate = Math.min(remaining, inv.balanceDue);
            newAllocations[inv.id] = allocate;
            remaining -= allocate;
        }
        return newAllocations;
    }

    // Effect to reset/re-allocate when invoices list changes (e.g. customer change)
    // We only allocate if we have an amount filled
    useEffect(() => {
        if (unpaidInvoices && amountReceived > 0) {
            const newAlloc = autoAllocate(amountReceived, unpaidInvoices);
            const timer = setTimeout(() => {
                setAllocations(newAlloc);
            }, 0);
            return () => clearTimeout(timer);
        } else if (!unpaidInvoices) {
            setAllocations({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unpaidInvoices]);

    // Initial load
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



    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
    const remainingToAllocate = amountReceived - totalAllocated;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!customerId) {
            alert('Silakan pilih pelanggan');
            return;
        }
        if (amountReceived <= 0) {
            alert('Jumlah diterima harus lebih dari 0');
            return;
        }
        if (totalAllocated <= 0) {
            alert('Silakan alokasikan pembayaran ke setidaknya satu faktur');
            return;
        }
        if (remainingToAllocate < -0.01) { // Floating point tolerance
            alert('Jumlah teralokasi melebihi jumlah diterima');
            return;
        }

        const allocationList = Object.entries(allocations)
            .filter(([, amount]) => amount > 0)
            .map(([invId, amount]) => ({
                invoiceId: Number(invId),
                amount,
            }));

        try {
            await receivePayment.mutateAsync({
                customerId,
                receivedDate: paymentDate,
                method: paymentMethod,
                amountTotal: amountReceived,
                allocations: allocationList,
                referenceNo: referenceNo || undefined,
                memo: memo || undefined,
            });

            alert('Pembayaran berhasil diterima!');
            router.push('/sales/invoices'); // Or to payment detail if we have one
        } catch (err) {
            alert(`Gagal menerima pembayaran: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    }

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
                                onClick={() => router.push('/sales/invoices')}
                                style={{ padding: 'var(--space-2)' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">Terima Pembayaran</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Catat pembayaran dari pelanggan
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/sales/invoices')}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={receivePayment.isPending}
                            >
                                {receivePayment.isPending ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <Save size={18} />
                                )}
                                Simpan Pembayaran
                            </button>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: '1rem', fontWeight: 600 }}>
                            Detail Pembayaran
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Pelanggan *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{
                                        position: 'absolute',
                                        left: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)',
                                        pointerEvents: 'none'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Pilih pelanggan..."
                                        value={customersData?.find(c => c.id === customerId)?.name || ''}
                                        readOnly
                                        onClick={() => setIsCustomerModalOpen(true)}
                                        style={{
                                            cursor: 'pointer',
                                            width: '100%',
                                            paddingLeft: 36,
                                            border: !customerId ? '1px solid var(--accent-red)' : undefined
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Jumlah Pembayaran *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={amountReceived || ''}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setAmountReceived(val);
                                            setAllocations(autoAllocate(val, unpaidInvoices));
                                        }}
                                        required
                                        style={{ paddingLeft: 35, textAlign: 'right' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Tanggal *
                                </label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Metode Pembayaran *
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    required
                                >
                                    {PAYMENT_METHODS.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    No. Referensi
                                </label>
                                <input
                                    type="text"
                                    value={referenceNo}
                                    onChange={(e) => setReferenceNo(e.target.value)}
                                    placeholder="cth. TRf-12345"
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Memo
                            </label>
                            <input
                                type="text"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Catatan opsional"
                            />
                        </div>
                    </div>

                    {/* Unpaid Invoices */}
                    {customerId && (
                        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                    Faktur Belum Lunas
                                </h3>
                                <div style={{ fontSize: '0.875rem' }}>
                                    Belum Teralokasi: <span style={{ fontWeight: 600, color: remainingToAllocate < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                        {formatCurrency(remainingToAllocate)}
                                    </span>
                                </div>
                            </div>

                            {invoicesLoading ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>Memuat faktur...</p>
                                </div>
                            ) : !unpaidInvoices || unpaidInvoices.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Tidak ada faktur belum lunas untuk pelanggan ini.
                                </div>
                            ) : (
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>No. Faktur</th>
                                                <th>Tanggal Jatuh Tempo</th>
                                                <th style={{ textAlign: 'right' }}>Total</th>
                                                <th style={{ textAlign: 'right' }}>Sisa Tagihan</th>
                                                <th style={{ textAlign: 'right', width: 200 }}>Alokasi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {unpaidInvoices.map((inv) => (
                                                <tr key={inv.id}>
                                                    <td style={{ fontWeight: 500 }}>{inv.invoiceNo}</td>
                                                    <td>{formatDate(inv.dueDate)}</td>
                                                    <td className="money" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                        {formatCurrency(inv.grandTotal)}
                                                    </td>
                                                    <td className="money" style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatCurrency(inv.balanceDue)}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={inv.balanceDue}
                                                            value={allocations[inv.id] || ''}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                setAllocations(prev => ({
                                                                    ...prev,
                                                                    [inv.id]: val
                                                                }));
                                                            }}
                                                            style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-600)' }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                <td colSpan={4} style={{ textAlign: 'right' }}>Total Teralokasi</td>
                                                <td style={{ textAlign: 'right', color: 'var(--primary-600)' }}>
                                                    {formatCurrency(totalAllocated)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </main>

            {/* Customer Selection Modal */}
            <SelectCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSelect={(customer) => {
                    setCustomerId(customer.id);
                    setAllocations({}); // Reset allocations
                    setAmountReceived(0);
                    setIsCustomerModalOpen(false);
                }}
            />
        </div>
    );
}
