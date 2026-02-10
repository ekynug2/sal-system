'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useSalesReport } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';

/**
 * Render the sales report page with date-range filters, refresh and print actions, and a summarized sales overview.
 *
 * @returns The React element for the sales report page, containing controls for selecting a date range, buttons to refresh and print, and a summary of sales metrics (total sales, invoice count, total COGS, and gross profit).
 */
export default function SalesReportPage() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [from, setFrom] = useState(startOfMonth);
    const [to, setTo] = useState(endOfMonth);

    const { data: report, isLoading, refetch, isFetching } = useSalesReport({ from, to });

    function handlePrint() {
        window.print();
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Laporan Penjualan</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                            Segarkan
                        </button>
                        <button className="btn btn-secondary" onClick={handlePrint}>
                            <Download size={16} />
                            Cetak
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card_p4 mb-6 print:hidden" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="text-sm font-medium">Dari:</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="text-sm font-medium">Sampai:</label>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                </div>

                {/* Report Content */}
                <div className="card_p4 print:shadow-none print:border-none" style={{ padding: '32px', minHeight: '500px' }}>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold">RINGKASAN PENJUALAN</h2>
                        <p className="text-gray-500">
                            {formatDate(from)} - {formatDate(to)}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>
                    ) : !report ? (
                        <div className="text-center p-12 text-gray-500">Tidak ada data tersedia</div>
                    ) : (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Total Penjualan</div>
                                    <div className="text-2xl font-bold">{formatCurrency(report.totalSales)}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Jumlah Faktur</div>
                                    <div className="text-2xl font-bold">{report.invoiceCount}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-1">Total HPP</div>
                                    <div className="text-2xl font-bold">{formatCurrency(report.totalCogs)}</div>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                    <div className="text-sm text-green-600 mb-1">Laba Kotor</div>
                                    <div className="text-2xl font-bold text-green-700">{formatCurrency(report.grossProfit)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                @media print {
                    .print\\:hidden { display: none !important; }
                    .app-layout { grid-template-columns: 1fr; }
                    .main-content { padding: 0; }
                    .sidebar { display: none; }
                }
            `}</style>
        </div>
    );
}