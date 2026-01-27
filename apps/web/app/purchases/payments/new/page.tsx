'use client';

// =============================================================================
// SAL Accounting System - Create Purchase Payment
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useCreatePurchasePayment, useUnpaidBills } from '@/hooks/use-purchases';
import { useSuppliers } from '@/hooks/use-master-data';
import { formatCurrency, formatDate } from '@/lib/api-client';
import {
    ArrowLeft,
    CheckCircle,
    Loader2,
} from 'lucide-react';

export default function CreatePurchasePaymentPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    // Master Data
    const { data: suppliersData } = useSuppliers();
    const suppliers = suppliersData || [];

    // State
    const [supplierId, setSupplierId] = useState<number | null>(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('BANK_TRANSFER');
    const [amountTotal, setAmountTotal] = useState<number>(0);
    const [referenceNo, setReferenceNo] = useState('');
    const [memo, setMemo] = useState('');

    // Unpaid Bills
    const { data: unpaidBills, isLoading: loadingBills } = useUnpaidBills(supplierId || undefined);
    const [allocations, setAllocations] = useState<{ [billId: number]: number }>({});

    const createPayment = useCreatePurchasePayment();
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    // Auto allocate when amount changes or bills loaded
    /*
    useEffect(() => {
        // Implement auto allocation logic if needed, but manual is safer for MVP
    }, [amountTotal, unpaidBills]);
    */

    if (authLoading) return null;
    if (!user) { router.push('/login'); return null; }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);

    // Handlers
    function handleAllocationChange(billId: number, value: number, max: number) {
        if (value > max) value = max;
        if (value < 0) value = 0;

        setAllocations(prev => ({
            ...prev,
            [billId]: value
        }));
    }

    function autoAllocate() {
        if (!unpaidBills) return;
        let remaining = amountTotal;
        const newAllocations: { [key: number]: number } = {};

        // Sort by due date asc (oldest first)
        const sortedBills = [...unpaidBills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        for (const bill of sortedBills) {
            if (remaining <= 0) break;
            const due = bill.balanceDue;
            const pay = Math.min(remaining, due);
            if (pay > 0) {
                newAllocations[bill.id] = pay;
                remaining -= pay;
            }
        }
        setAllocations(newAllocations);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!supplierId) { alert('Select supplier'); return; }
        if (amountTotal <= 0) { alert('Enter valid amount'); return; }
        if (Math.abs(amountTotal - totalAllocated) > 0.01) {
            alert(`Allocation mismatch. Allocated: ${formatCurrency(totalAllocated)}, Total: ${formatCurrency(amountTotal)}`);
            return;
        }

        const allocationList = Object.entries(allocations)
            .filter(([_, amount]) => amount > 0)
            .map(([billId, amount]) => ({
                billId: Number(billId),
                amount
            }));

        if (allocationList.length === 0) { alert('No bills selected for payment'); return; }

        try {
            await createPayment.mutateAsync({
                supplierId,
                paymentDate,
                method,
                amountTotal,
                allocations: allocationList,
                referenceNo: referenceNo || undefined,
                memo: memo || undefined,
                // bankAccountId optional
            });
            alert('Payment recorded successfully');
            router.push('/purchases/bills'); // Or to payment detail if exists
        } catch (err) {
            alert(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <form onSubmit={handleSubmit}>
                    <div className="page-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => router.push('/purchases/bills')}>
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="page-title">Record Purchase Payment</h1>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={createPayment.isPending}>
                            {createPayment.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            Save Payment
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 'var(--space-6)' }}>

                        {/* Left: Payment Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="card_p4" style={{ padding: 'var(--space-4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Payment Details</h3>

                                <div className="form-group mb-4">
                                    <label className="label">Supplier *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Search supplier..."
                                            value={supplierSearch}
                                            onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                                            onFocus={() => { setSupplierSearch(''); setShowSupplierDropdown(true); }}
                                            className="input w-full"
                                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                        />
                                        {showSupplierDropdown && (
                                            <div className="dropdown-menu">
                                                {filteredSuppliers.map(s => (
                                                    <div key={s.id} className="dropdown-item" onClick={() => {
                                                        setSupplierId(s.id);
                                                        setSupplierSearch(s.name);
                                                        setShowSupplierDropdown(false);
                                                        setAllocations({});
                                                    }}>
                                                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group mb-4">
                                    <label className="label">Payment Date *</label>
                                    <input type="date" className="input" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                                </div>

                                <div className="form-group mb-4">
                                    <label className="label">Amount Received *</label>
                                    <input
                                        type="number"
                                        className="input money"
                                        value={amountTotal}
                                        onChange={e => setAmountTotal(Number(e.target.value))}
                                        min={0}
                                        style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                    />
                                    <button type="button" className="btn btn-secondary btn-sm mt-2 w-full" onClick={autoAllocate}>
                                        Auto Allocate
                                    </button>
                                </div>

                                <div className="form-group mb-4">
                                    <label className="label">Payment Method</label>
                                    <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK_TRANSFER">Bank Transfer</option>
                                        <option value="CHECK">Check</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>

                                <div className="form-group mb-4">
                                    <label className="label">Reference No</label>
                                    <input type="text" className="input" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="e.g. TR-12345" />
                                </div>

                                <div className="form-group">
                                    <label className="label">Memo</label>
                                    <textarea className="input" rows={3} value={memo} onChange={e => setMemo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Right: Unpaid Bills */}
                        <div className="card_p0" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Unpaid Bills</h3>
                                <div style={{ fontSize: '0.875rem' }}>
                                    Allocated: <span style={{ fontWeight: 600, color: Math.abs(totalAllocated - amountTotal) < 0.01 ? 'green' : 'red' }}>{formatCurrency(totalAllocated)}</span>
                                    {' / '}
                                    <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(amountTotal)}</span>
                                </div>
                            </div>

                            {loadingBills ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
                            ) : !supplierId ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>Select a supplier to see unpaid bills</div>
                            ) : unpaidBills?.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>No unpaid bills found</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ minWidth: 600 }}>
                                        <thead>
                                            <tr>
                                                <th>Bill #</th>
                                                <th>Date</th>
                                                <th>Due Date</th>
                                                <th style={{ textAlign: 'right' }}>Total</th>
                                                <th style={{ textAlign: 'right' }}>Balance Due</th>
                                                <th style={{ textAlign: 'right', width: 150 }}>Payment</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {unpaidBills?.map(bill => (
                                                <tr key={bill.id} style={{ background: allocations[bill.id] > 0 ? 'var(--primary-50)' : undefined }}>
                                                    <td>{bill.billNo}</td>
                                                    <td>{formatDate(bill.billDate)}</td>
                                                    <td style={{ color: new Date(bill.dueDate) < new Date() ? 'red' : 'inherit' }}>{formatDate(bill.dueDate)}</td>
                                                    <td style={{ textAlign: 'right' }}>{formatCurrency(bill.grandTotal)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(bill.balanceDue)}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <input
                                                            type="number"
                                                            className="input text-right"
                                                            value={allocations[bill.id] || ''}
                                                            onChange={e => handleAllocationChange(bill.id, Number(e.target.value), bill.balanceDue)}
                                                            placeholder="0"
                                                            min={0}
                                                            max={bill.balanceDue}
                                                            style={{ width: 120, padding: '4px' }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Total Allocated</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-600)' }}>{formatCurrency(totalAllocated)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Overlay */}
                    {showSupplierDropdown && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowSupplierDropdown(false)} />
                    )}
                </form>
            </main>

            <style jsx>{`
                .label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; }
                .input { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
                .dropdown-menu {
                    position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd;
                    border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 50; max-height: 200px; overflow-y: auto;
                }
                .dropdown-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; }
                .dropdown-item:hover { background-color: #f5f5f5; }
            `}</style>
        </div>
    );
}
