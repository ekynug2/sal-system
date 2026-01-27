'use client';

// =============================================================================
// SAL Accounting System - Receive Payment Page
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useReceivePayment, useUnpaidInvoices } from '@/hooks/use-sales';
import { useCustomers } from '@/hooks/use-master-data';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    ArrowLeft,
    DollarSign,
    Save,
    Loader2,
    Calendar,
    Wallet,
} from 'lucide-react';

const PAYMENT_METHODS = [
    { id: 'CASH', label: 'Cash' },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { id: 'CHECK', label: 'Check / Giro' },
    { id: 'QRIS', label: 'QRIS / E-Money' },
    { id: 'OTHER', label: 'Other' },
];

export default function ReceivePaymentPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    // Hooks
    const receivePayment = useReceivePayment();
    const { data: customersData, isLoading: custLoading } = useCustomers({ activeOnly: true });

    // State
    const [customerId, setCustomerId] = useState<number | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
    const [amountReceived, setAmountReceived] = useState<number>(0);
    const [referenceNo, setReferenceNo] = useState('');
    const [memo, setMemo] = useState('');
    const [allocations, setAllocations] = useState<Record<number, number>>({});

    // Fetch unpaid invoices when customer selected
    const { data: unpaidInvoices, isLoading: invoicesLoading } = useUnpaidInvoices(customerId);

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

    // Auto allocate when amount received changes
    useEffect(() => {
        if (!unpaidInvoices || !amountReceived) return;

        let remaining = amountReceived;
        const newAllocations: Record<number, number> = {};

        // Auto allocate logic: oldest due date first (already sorted by API)
        for (const inv of unpaidInvoices) {
            if (remaining <= 0) break;

            const allocate = Math.min(remaining, inv.balanceDue);
            newAllocations[inv.id] = allocate;
            remaining -= allocate;
        }

        setAllocations(newAllocations);
    }, [amountReceived, unpaidInvoices]); // Re-run when amount or invoices change

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
    const remainingToAllocate = amountReceived - totalAllocated;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!customerId) {
            alert('Please select a customer');
            return;
        }
        if (amountReceived <= 0) {
            alert('Amount received must be greater than 0');
            return;
        }
        if (totalAllocated <= 0) {
            alert('Please allocate payment to at least one invoice');
            return;
        }
        if (remainingToAllocate < -0.01) { // Floating point tolerance
            alert('Allocated amount exceeds received amount');
            return;
        }

        const allocationList = Object.entries(allocations)
            .filter(([_, amount]) => amount > 0)
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

            alert('Payment received successfully!');
            router.push('/sales/invoices'); // Or to payment detail if we have one
        } catch (err) {
            alert(`Failed to receive payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                                <h1 className="page-title">Receive Payment</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                                    Record payment from customer
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.push('/sales/invoices')}
                            >
                                Cancel
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
                                Save Payment
                            </button>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
                        <h3 style={{ margin: 0, marginBottom: 'var(--space-4)', fontSize: '1rem', fontWeight: 600 }}>
                            Payment Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Customer *
                                </label>
                                <select
                                    value={customerId || ''}
                                    onChange={(e) => {
                                        setCustomerId(e.target.value ? Number(e.target.value) : null);
                                        setAllocations({}); // Reset allocations
                                        setAmountReceived(0);
                                    }}
                                    required
                                    disabled={custLoading}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Select customer...</option>
                                    {customersData?.map(c => (
                                        <option key={c.id} value={c.id}>
                                            [{c.customerCode}] {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Payment Amount *
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={amountReceived || ''}
                                        onChange={(e) => setAmountReceived(Number(e.target.value))}
                                        required
                                        style={{ paddingLeft: 35, textAlign: 'right' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', fontWeight: 500 }}>
                                    Date *
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
                                    Payment Method *
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
                                    Reference No.
                                </label>
                                <input
                                    type="text"
                                    value={referenceNo}
                                    onChange={(e) => setReferenceNo(e.target.value)}
                                    placeholder="e.g. TRf-12345"
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
                                placeholder="Optional notes"
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
                                    Unpaid Invoices
                                </h3>
                                <div style={{ fontSize: '0.875rem' }}>
                                    Unallocated: <span style={{ fontWeight: 600, color: remainingToAllocate < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                        {formatCurrency(remainingToAllocate)}
                                    </span>
                                </div>
                            </div>

                            {invoicesLoading ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                                    <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} />
                                    <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>Loading invoices...</p>
                                </div>
                            ) : !unpaidInvoices || unpaidInvoices.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No unpaid invoices found for this customer.
                                </div>
                            ) : (
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Invoice No</th>
                                                <th>Due Date</th>
                                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                                <th style={{ textAlign: 'right' }}>Balance Due</th>
                                                <th style={{ textAlign: 'right', width: 200 }}>Allocation</th>
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
                                                <td colSpan={4} style={{ textAlign: 'right' }}>Total Allocated</td>
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
        </div>
    );
}
