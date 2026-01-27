'use client';

// =============================================================================
// SAL Accounting System - Purchase Bills List Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { usePurchaseBills } from '@/hooks/use-purchases';
import { formatDate, formatCurrency } from '@/lib/api-client';
import {
    Plus,
    Loader2,
    FileText,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

export default function PurchaseBillsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);

    const { data: billsData, isLoading } = usePurchaseBills({
        page,
        limit: 20,
    });

    if (authLoading) return null;

    if (!user) {
        router.push('/login');
        return null;
    }

    const bills = billsData?.data || [];
    const meta = billsData?.meta;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Purchase Bills</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Manage supplier bills and accounts payable
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => router.push('/purchases/bills/new')}
                    >
                        <Plus size={18} />
                        New Bill
                    </button>
                </div>

                {/* List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-500)' }} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>Loading bills...</p>
                        </div>
                    ) : bills.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ margin: '0 auto', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Bills Found</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: 'var(--space-2) auto' }}>
                                Start by recording a new bill from a supplier.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/purchases/bills/new')}
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                <Plus size={18} />
                                Create New Bill
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Bill #</th>
                                            <th>Supplier</th>
                                            <th>Date</th>
                                            <th>Due Date</th>
                                            <th style={{ textAlign: 'right' }}>Amount</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'right' }}>Balance Due</th>
                                            <th style={{ width: 60 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bills.map((bill) => (
                                            <tr
                                                key={bill.id}
                                                onClick={() => router.push(`/purchases/bills/${bill.id}`)}
                                                style={{ cursor: 'pointer' }}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <td style={{ fontWeight: 500 }}>{bill.billNo}</td>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{bill.supplierName}</div>
                                                    {bill.supplierInvoiceNo && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            Ref: {bill.supplierInvoiceNo}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{formatDate(bill.billDate)}</td>
                                                <td>{formatDate(bill.dueDate)}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(bill.grandTotal)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`badge ${bill.status === 'POSTED' ? 'badge-green' :
                                                            bill.status === 'DRAFT' ? 'badge-gray' :
                                                                bill.status === 'PAID' ? 'badge-blue' : 'badge-red'
                                                        }`}>
                                                        {bill.status}
                                                    </span>
                                                </td>
                                                <td className="money" style={{ textAlign: 'right', fontWeight: 500, color: bill.balanceDue > 0 ? 'var(--accent-red)' : 'inherit' }}>
                                                    {formatCurrency(bill.balanceDue)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: 'var(--space-1)' }}>
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {meta && meta.totalPages > 1 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                                    padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)'
                                }}>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        Page {page} of {meta.totalPages}
                                    </span>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={page === meta.totalPages}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
