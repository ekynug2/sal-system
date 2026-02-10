'use client';

// =============================================================================
// SAL Accounting System - Purchase Bills List Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { ExportPrintToolbar } from '@/ui/components/export-print-toolbar';
import { usePurchaseBills } from '@/hooks/use-purchases';
import { formatDate, formatCurrency } from '@/lib/api-client';
import { exportToExcel, exportToCSV, type ExportColumn } from '@/lib/export-utils';
import { printHTML, generatePrintTable } from '@/lib/print-utils';
import type { PurchaseBill } from '@/shared/types';
import {
    Plus,
    Loader2,
    FileText,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

/**
 * Renders the purchase bills listing page with export, print, and pagination controls.
 *
 * Shows a loading state, an empty-state prompt, or a table of purchase bills with actions for exporting,
 * printing, creating new bills, and recording payments. If the user is not authenticated the component
 * navigates to `/login`.
 *
 * @returns The React element for the purchase bills page.
 */
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

    const bills = billsData || [];

    // Export column definitions
    const exportColumns: ExportColumn<PurchaseBill>[] = [
        { header: 'No. Tagihan', accessor: 'billNo', width: 15 },
        { header: 'Pemasok', accessor: 'supplierName', width: 25 },
        { header: 'Ref. Pemasok', accessor: 'supplierInvoiceNo', width: 15 },
        { header: 'Tanggal', accessor: (row) => formatDate(row.billDate), width: 12 },
        { header: 'Jatuh Tempo', accessor: (row) => formatDate(row.dueDate), width: 12 },
        { header: 'Total Akhir', accessor: 'grandTotal', width: 15 },
        { header: 'Dibayar', accessor: 'paidAmount', width: 15 },
        { header: 'Saldo Hutang', accessor: 'balanceDue', width: 15 },
        { header: 'Status', accessor: 'status', width: 12 },
    ];

    function handleExportExcel() {
        exportToExcel(bills, exportColumns, {
            filename: `tagihan_pembelian_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Tagihan',
        });
    }

    function handleExportCSV() {
        exportToCSV(bills, exportColumns, {
            filename: `tagihan_pembelian_${new Date().toISOString().split('T')[0]}`,
        });
    }

    function handlePrint() {
        const printColumns = [
            { header: 'No. Tagihan', accessor: 'billNo' as keyof PurchaseBill },
            { header: 'Pemasok', accessor: 'supplierName' as keyof PurchaseBill },
            { header: 'Tanggal', accessor: (row: PurchaseBill) => formatDate(row.billDate) },
            { header: 'Jatuh Tempo', accessor: (row: PurchaseBill) => formatDate(row.dueDate) },
            { header: 'Jumlah', accessor: (row: PurchaseBill) => formatCurrency(row.grandTotal), className: 'money' },
            { header: 'Saldo', accessor: (row: PurchaseBill) => formatCurrency(row.balanceDue), className: 'money' },
            { header: 'Status', accessor: 'status' as keyof PurchaseBill },
        ];

        const html = generatePrintTable(bills, printColumns, {
            title: 'Tagihan Pembelian',
            subtitle: 'Semua Tagihan',
        });

        printHTML(html, 'Tagihan Pembelian');
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Tagihan Pembelian</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola tagihan pemasok dan hutang usaha
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <ExportPrintToolbar
                            onPrint={handlePrint}
                            onExportExcel={handleExportExcel}
                            onExportCSV={handleExportCSV}
                            showPrint={bills.length > 0}
                            showExport={bills.length > 0}
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={() => router.push('/purchases/payments/new')}
                        >
                            Catat Pembayaran
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/purchases/bills/new')}
                        >
                            <Plus size={18} />
                            Tagihan Baru
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--primary-500)' }} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>Memuat tagihan...</p>
                        </div>
                    ) : bills.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ margin: '0 auto', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tidak Ada Tagihan Ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: 'var(--space-2) auto' }}>
                                Mulai dengan mencatat tagihan baru dari pemasok.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/purchases/bills/new')}
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                <Plus size={18} />
                                Buat Tagihan Baru
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Tagihan</th>
                                            <th>Pemasok</th>
                                            <th>Tanggal</th>
                                            <th>Jatuh Tempo</th>
                                            <th style={{ textAlign: 'right' }}>Jumlah</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'right' }}>Saldo Hutang</th>
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

                            {/* Pagination - TODO: Re-implement when API returns meta */}
                            {bills.length > 0 && (
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
                                        Halaman {page}
                                    </span>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={bills.length < 20}
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