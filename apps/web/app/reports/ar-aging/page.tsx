'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useARAging } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import Link from 'next/link';

/**
 * Renders the Accounts Receivable aging report page with filters, actions, and a per-customer breakdown table.
 *
 * Displays a date filter (as of), refresh and print actions, loading/empty states, a per-customer aging table, and an aggregated totals row.
 *
 * @returns The React element for the AR aging report page.
 */
export default function ARAgingPage() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const [asOf, setAsOf] = useState(today);

    const { data: reports, isLoading, refetch, isFetching } = useARAging({ asOf });

    function handlePrint() {
        window.print();
    }

    const totalAging = reports?.reduce((acc, curr) => ({
        current: acc.current + curr.aging.current,
        days1_30: acc.days1_30 + curr.aging.days1_30,
        days31_60: acc.days31_60 + curr.aging.days31_60,
        days61_90: acc.days61_90 + curr.aging.days61_90,
        over90: acc.over90 + curr.aging.over90,
        total: acc.total + curr.aging.total,
    }), { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 });

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Umur Piutang (AR)</h1>
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
                        <h2 className="text-2xl font-bold">RINGKASAN UMUR PIUTANG</h2>
                        <p className="text-gray-500">
                            Per {formatDate(asOf)}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>
                    ) : !reports || reports.length === 0 ? (
                        <div className="text-center p-12 text-gray-500">Tidak ada faktur yang belum dibayar ditemukan</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Pelanggan</th>
                                        <th className="px-4 py-3 text-right">Lancar</th>
                                        <th className="px-4 py-3 text-right">1-30 Hari</th>
                                        <th className="px-4 py-3 text-right">31-60 Hari</th>
                                        <th className="px-4 py-3 text-right">61-90 Hari</th>
                                        <th className="px-4 py-3 text-right">&gt; 90 Hari</th>
                                        <th className="px-4 py-3 text-right font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((report) => (
                                        <tr key={report.customerId} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                <Link href={`/customers/${report.customerId}`} className="hover:underline text-primary-600">
                                                    {report.customerName}
                                                </Link>
                                                <div className="text-xs text-gray-500">{report.customerCode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">{report.aging.current > 0 ? formatCurrency(report.aging.current) : '-'}</td>
                                            <td className="px-4 py-3 text-right">{report.aging.days1_30 > 0 ? formatCurrency(report.aging.days1_30) : '-'}</td>
                                            <td className="px-4 py-3 text-right">{report.aging.days31_60 > 0 ? formatCurrency(report.aging.days31_60) : '-'}</td>
                                            <td className="px-4 py-3 text-right">{report.aging.days61_90 > 0 ? formatCurrency(report.aging.days61_90) : '-'}</td>
                                            <td className="px-4 py-3 text-right">{report.aging.over90 > 0 ? formatCurrency(report.aging.over90) : '-'}</td>
                                            <td className="px-4 py-3 text-right font-bold">{formatCurrency(report.aging.total)}</td>
                                        </tr>
                                    ))}
                                    {totalAging && (
                                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                            <td className="px-4 py-4">TOTAL</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(totalAging.current)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(totalAging.days1_30)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(totalAging.days31_60)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(totalAging.days61_90)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(totalAging.over90)}</td>
                                            <td className="px-4 py-4 text-right text-lg">{formatCurrency(totalAging.total)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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