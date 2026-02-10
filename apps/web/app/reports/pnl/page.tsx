'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { usePnLReport } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';

/**
 * Renders the Profit & Loss (Laba & Rugi) page with date filters, refresh and print controls, and a detailed P&L breakdown.
 *
 * The component initializes the date range to the current month, fetches a P&L report for the selected range, and displays loading, empty, or detailed report states. When data is available it lists income, cost of goods sold, expenses, and shows subtotals, gross profit, and net income. The UI includes buttons to refetch the report and to print the page.
 *
 * @returns The React element for the Profit & Loss page.
 */
export default function ProfitLossPage() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [from, setFrom] = useState(startOfMonth);
    const [to, setTo] = useState(endOfMonth);

    const { data: report, isLoading, refetch, isFetching } = usePnLReport({ from, to });

    function handlePrint() {
        window.print();
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Laporan Laba Rugi</h1>
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
                        <h2 className="text-2xl font-bold">LABA & RUGI</h2>
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
                            {/* Income */}
                            <div className="mb-6">
                                <h3 className="section-title">Pendapatan</h3>
                                <div className="report-table">
                                    {report.income.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total Pendapatan</span>
                                        <span>{formatCurrency(report.totalIncome)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cost of Goods Sold */}
                            <div className="mb-6">
                                <h3 className="section-title">Harga Pokok Penjualan</h3>
                                <div className="report-table">
                                    {report.cogs.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total HPP</span>
                                        <span>{formatCurrency(report.totalCogs)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Gross Profit */}
                            <div className="report-row grand-total mb-8">
                                <span>Laba Kotor</span>
                                <span>{formatCurrency(report.grossProfit)}</span>
                            </div>

                            {/* Expenses */}
                            <div className="mb-6">
                                <h3 className="section-title">Beban</h3>
                                <div className="report-table">
                                    {report.expenses.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total Beban</span>
                                        <span>{formatCurrency(report.totalExpenses)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Income */}
                            <div className="report-row grand-total net-income">
                                <span>Laba Bersih</span>
                                <span>{formatCurrency(report.netIncome)}</span>
                            </div>

                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .section-title { font-weight: 700; color: #555; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
                .report-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #f0f0f0; }
                .report-row.total { font-weight: 600; border-top: 1px solid #ddd; border-bottom: none; padding-top: 8px; margin-top: 4px; }
                .report-row.grand-total { font-weight: 700; font-size: 1.1rem; padding: 12px 0; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd; }
                .report-row.net-income { background-color: #f9fff9; padding: 16px; border: 2px solid #cfc; border-radius: 4px; }
                
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