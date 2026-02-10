'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useInventoryValuation } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import Link from 'next/link';

/**
 * Renders the Inventory Valuation page with controls to refresh, print, and filter the report by date.
 *
 * The component fetches and displays a per-item valuation table (quantity, average cost, total value),
 * shows loading and empty states, and includes a printable view that hides interactive controls.
 *
 * @returns The page's JSX element containing the inventory valuation report and UI controls.
 */
export default function InventoryValuationPage() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const [asOf, setAsOf] = useState(today);

    const { data: report, isLoading, refetch, isFetching } = useInventoryValuation({ asOf });

    function handlePrint() {
        window.print();
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Nilai Persediaan</h1>
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
                    {/* Placeholder for future item category filter */}
                </div>

                {/* Report Content */}
                <div className="card_p4 print:shadow-none print:border-none" style={{ padding: '32px', minHeight: '500px' }}>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold">NILAI PERSEDIAAN</h2>
                        <p className="text-gray-500">
                            Per {formatDate(asOf)}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" size={32} /></div>
                    ) : !report || !report.items || report.items.length === 0 ? (
                        <div className="text-center p-12 text-gray-500">Tidak ada data persediaan tersedia</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Barang</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-right">Biaya Rata-rata</th>
                                        <th className="px-4 py-3 text-right">Total Nilai</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.items.map((item) => (
                                        <tr key={item.itemId} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                <Link href={`/inventory/ledger?itemId=${item.itemId}`} className="hover:underline text-primary-600">
                                                    {item.sku} - {item.name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-right">{item.onHand}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(item.avgCost)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(item.totalValue)}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                        <td className="px-4 py-4" colSpan={3}>TOTAL NILAI PERSEDIAAN</td>
                                        <td className="px-4 py-4 text-right text-lg">{formatCurrency(report.totalValue)}</td>
                                    </tr>
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