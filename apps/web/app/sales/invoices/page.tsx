'use client';

// =============================================================================
// SAL Accounting System - Sales Invoices Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { ExportPrintToolbar } from '@/ui/components/export-print-toolbar';
import { ConfirmDialog } from '@/ui/components/confirm-dialog';
import { useSalesInvoices, usePostInvoice } from '@/hooks/use-sales';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { exportToExcel, exportToCSV, type ExportColumn } from '@/lib/export-utils';
import { printHTML, generatePrintTable } from '@/lib/print-utils';
import type { SalesInvoice } from '@/shared/types';
import {
    Plus,
    Search,
    Filter,
    FileText,
    MoreVertical,
    Send,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
    DRAFT: 'badge-draft',
    POSTED: 'badge-posted',
    PARTIALLY_PAID: 'badge-partial',
    PAID: 'badge-paid',
    VOIDED: 'badge-voided',
};

/**
 * Render the Sales Invoices management page with search, filtering, export, print, per-invoice actions (view and post), and pagination.
 *
 * The page enforces authentication (redirects to /login when no user is present), fetches and displays invoice data, and provides UI flows for exporting to Excel/CSV, printing, and posting invoices (posting requires confirmation and shows success/error toasts).
 *
 * @returns The JSX element for the Sales Invoices listing and management page.
 */
export default function SalesInvoicesPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showActions, setShowActions] = useState<number | null>(null);
    const [confirmPost, setConfirmPost] = useState<{ open: boolean; invoiceId: number | null }>({
        open: false,
        invoiceId: null,
    });

    const { data, isLoading, error } = useSalesInvoices({ page, limit: 20, status: statusFilter || undefined });
    const postInvoice = usePostInvoice();

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

    const invoices = data || [];

    // Export column definitions
    const exportColumns: ExportColumn<SalesInvoice>[] = [
        { header: 'No. Faktur', accessor: 'invoiceNo', width: 15 },
        { header: 'Tanggal', accessor: (row) => formatDate(row.invoiceDate), width: 12 },
        { header: 'Pelanggan', accessor: 'customerName', width: 25 },
        { header: 'Jatuh Tempo', accessor: (row) => formatDate(row.dueDate), width: 12 },
        { header: 'Subtotal', accessor: 'subtotal', width: 15 },
        { header: 'Pajak', accessor: 'taxTotal', width: 12 },
        { header: 'Total Akhir', accessor: 'grandTotal', width: 15 },
        { header: 'Dibayar', accessor: 'paidAmount', width: 15 },
        { header: 'Saldo', accessor: 'balanceDue', width: 15 },
        { header: 'Status', accessor: 'status', width: 12 },
    ];

    // Handle Export to Excel
    function handleExportExcel() {
        exportToExcel(invoices, exportColumns, {
            filename: `faktur_penjualan_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Faktur',
        });
    }

    // Handle Export to CSV
    function handleExportCSV() {
        exportToCSV(invoices, exportColumns, {
            filename: `faktur_penjualan_${new Date().toISOString().split('T')[0]}`,
        });
    }

    // Handle Print
    function handlePrint() {
        const printColumns = [
            { header: 'No. Faktur', accessor: 'invoiceNo' as keyof SalesInvoice },
            { header: 'Tanggal', accessor: (row: SalesInvoice) => formatDate(row.invoiceDate) },
            { header: 'Pelanggan', accessor: 'customerName' as keyof SalesInvoice },
            { header: 'Jatuh Tempo', accessor: (row: SalesInvoice) => formatDate(row.dueDate) },
            { header: 'Jumlah', accessor: (row: SalesInvoice) => formatCurrency(row.grandTotal), className: 'money' },
            { header: 'Saldo', accessor: (row: SalesInvoice) => formatCurrency(row.balanceDue), className: 'money' },
            { header: 'Status', accessor: 'status' as keyof SalesInvoice },
        ];

        const html = generatePrintTable(invoices, printColumns, {
            title: 'Faktur Penjualan',
            subtitle: statusFilter ? `Status: ${statusFilter}` : 'Semua Faktur',
        });

        printHTML(html, 'Faktur Penjualan');
    }

    async function handlePost(invoiceId: number) {
        setConfirmPost({ open: true, invoiceId });
        setShowActions(null);
    }

    async function confirmPostInvoice() {
        if (!confirmPost.invoiceId) return;

        try {
            await postInvoice.mutateAsync(confirmPost.invoiceId);
            toast.success('Faktur berhasil diposting!', {
                description: 'Faktur telah diposting dan tidak dapat diubah.',
            });
        } catch (err) {
            toast.error('Gagal memposting faktur', {
                description: err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga',
            });
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Faktur Penjualan</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola faktur pelanggan dan lacak pembayaran
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/sales/invoices/new')}>
                        <Plus size={18} />
                        Faktur Baru
                    </button>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Cari berdasarkan nomor faktur atau pelanggan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42 }}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: 180 }}
                        >
                            <option value="">Semua Status</option>
                            <option value="DRAFT">Draft</option>
                            <option value="POSTED">Diposting</option>
                            <option value="PARTIALLY_PAID">Dibayar Sebagian</option>
                            <option value="PAID">Lunas</option>
                            <option value="VOIDED">Dibatalkan</option>
                        </select>
                        <button className="btn btn-secondary">
                            <Filter size={18} />
                            Filter Lainnya
                        </button>

                        {/* Export & Print Toolbar */}
                        <ExportPrintToolbar
                            onPrint={handlePrint}
                            onExportExcel={handleExportExcel}
                            onExportCSV={handleExportCSV}
                            showPrint={invoices.length > 0}
                            showExport={invoices.length > 0}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Memuat faktur...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Gagal memuat faktur. Silakan coba lagi.
                        </div>
                    ) : invoices.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>Tidak ada faktur ditemukan</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                Buat faktur pertama Anda untuk memulai
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                                onClick={() => router.push('/sales/invoices/new')}
                            >
                                <Plus size={18} />
                                Buat Faktur
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Faktur</th>
                                            <th>Tanggal</th>
                                            <th>Pelanggan</th>
                                            <th>Jatuh Tempo</th>
                                            <th style={{ textAlign: 'right' }}>Jumlah</th>
                                            <th style={{ textAlign: 'right' }}>Saldo</th>
                                            <th>Status</th>
                                            <th style={{ width: 50 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr key={inv.id}>
                                                <td>
                                                    <button
                                                        onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontFamily: 'var(--font-mono)',
                                                            fontWeight: 600,
                                                            color: 'var(--primary-500)',
                                                        }}
                                                    >
                                                        {inv.invoiceNo}
                                                    </button>
                                                </td>
                                                <td>{formatDate(inv.invoiceDate)}</td>
                                                <td>{inv.customerName}</td>
                                                <td>{formatDate(inv.dueDate)}</td>
                                                <td className="money" style={{ textAlign: 'right' }}>
                                                    {formatCurrency(inv.grandTotal)}
                                                </td>
                                                <td
                                                    className="money"
                                                    style={{
                                                        textAlign: 'right',
                                                        color: inv.balanceDue > 0 ? 'var(--accent-red)' : 'inherit',
                                                    }}
                                                >
                                                    {formatCurrency(inv.balanceDue)}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusColors[inv.status] || 'badge-draft'}`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ position: 'relative' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: 'var(--space-2)' }}
                                                        onClick={() => setShowActions(showActions === inv.id ? null : inv.id)}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {showActions === inv.id && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: '100%',
                                                                background: 'var(--bg-primary)',
                                                                borderRadius: 'var(--radius-md)',
                                                                boxShadow: 'var(--shadow-lg)',
                                                                border: '1px solid var(--border-color)',
                                                                zIndex: 10,
                                                                minWidth: 160,
                                                                padding: 'var(--space-2)',
                                                            }}
                                                        >
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                                                onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                                                            >
                                                                <Eye size={16} />
                                                                Lihat Detail
                                                            </button>
                                                            {inv.status === 'DRAFT' && (
                                                                <button
                                                                    className="btn btn-ghost"
                                                                    style={{ width: '100%', justifyContent: 'flex-start' }}
                                                                    onClick={() => handlePost(inv.id)}
                                                                    disabled={postInvoice.isPending}
                                                                >
                                                                    <Send size={16} />
                                                                    Posting Faktur
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination - TODO: Re-implement when API returns meta */}
                            {invoices.length > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 'var(--space-4)',
                                        borderTop: '1px solid var(--border-color)',
                                    }}
                                >
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Menampilkan {invoices.length} faktur
                                    </span>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0 var(--space-4)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Halaman {page}
                                        </span>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setPage((p) => p + 1)}
                                            disabled={invoices.length < 20}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Confirmation Dialog */}
                <ConfirmDialog
                    open={confirmPost.open}
                    onOpenChange={(open) => setConfirmPost({ open, invoiceId: null })}
                    title="Posting Faktur?"
                    description="Apakah Anda yakin ingin memposting faktur ini? Setelah diposting, faktur tidak dapat diedit atau dihapus. Tindakan ini bersifat permanen."
                    confirmLabel="Posting Faktur"
                    cancelLabel="Batal"
                    onConfirm={confirmPostInvoice}
                    variant="warning"
                    isLoading={postInvoice.isPending}
                />
            </main>
        </div>
    );
}