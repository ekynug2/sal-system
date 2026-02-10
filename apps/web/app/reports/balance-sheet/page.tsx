'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useBalanceSheet } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';

/**
 * Renders the Balance Sheet (Neraca) page with a date filter, refresh, and print controls.
 *
 * Displays assets, liabilities, and equity for the selected "as of" date and shows section totals
 * and a combined total for liabilities and equity. While data is loading a spinner is shown;
 * when no data is available a placeholder message is displayed.
 *
 * @returns The page's JSX element containing the balance sheet UI.
 */
export default function BalanceSheetPage() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const [asOf, setAsOf] = useState(today);

    const { data: report, isLoading, refetch, isFetching } = useBalanceSheet({ asOf });

    function handlePrint() {
        window.print();
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Neraca</h1>
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
                        <label className="text-sm font-medium">Per Tanggal:</label>
                        <input
                            type="date"
                            value={asOf}
                            onChange={(e) => setAsOf(e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                </div>

                {/* Report Content */}
                <div className="card_p4 print:shadow-none print:border-none" style={{ padding: '32px', minHeight: '500px' }}>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold">NERACA</h2>
                        <p className="text-gray-500">
                            Per {formatDate(asOf)}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>
                    ) : !report ? (
                        <div className="text-center p-12 text-gray-500">Tidak ada data tersedia</div>
                    ) : (
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {/* Assets */}
                            <div className="mb-8">
                                <h3 className="section-title">ASET</h3>
                                <div className="report-table">
                                    {report.assets.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total Aset</span>
                                        <span>{formatCurrency(report.totalAssets)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Liabilities */}
                            <div className="mb-8">
                                <h3 className="section-title">KEWAJIBAN</h3>
                                <div className="report-table">
                                    {report.liabilities.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total Kewajiban</span>
                                        <span>{formatCurrency(report.totalLiabilities)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Equity */}
                            <div className="mb-8">
                                <h3 className="section-title">EKUITAS</h3>
                                <div className="report-table">
                                    {report.equity.map(item => (
                                        <div key={item.accountCode} className="report-row">
                                            <span>{item.accountCode} - {item.accountName}</span>
                                            <span>{formatCurrency(item.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="report-row total">
                                        <span>Total Ekuitas</span>
                                        <span>{formatCurrency(report.totalEquity)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="report-row grand-total">
                                <span>Total Kewajiban & Ekuitas</span>
                                <span>{formatCurrency(report.totalLiabilities + report.totalEquity)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .section-title { font-weight: 700; color: #555; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; text-transform: uppercase; }
                .report-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #f0f0f0; }
                .report-row.total { font-weight: 600; border-top: 1px solid #ddd; border-bottom: none; padding-top: 8px; margin-top: 4px; }
                .report-row.grand-total { font-weight: 700; font-size: 1.1rem; padding: 12px 0; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd; margin-top: 16px; }
                
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