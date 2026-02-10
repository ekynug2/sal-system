'use client';

import { useState } from 'react';
import { Sidebar } from '@/ui/components/sidebar';
import { useTrialBalance } from '@/hooks/use-reports';
import { formatCurrency, formatDate } from '@/lib/api-client';
import { Loader2, RefreshCw, Download } from 'lucide-react';

export default function TrialBalancePage() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const [asOf, setAsOf] = useState(today);

    const { data: report, isLoading, refetch, isFetching } = useTrialBalance({ asOf });

    function handlePrint() {
        window.print();
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header print:hidden">
                    <h1 className="page-title">Neraca Saldo</h1>
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
                        <h2 className="text-2xl font-bold">NERACA SALDO</h2>
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
                            <div className="report-table">
                                <div className="report-row header" style={{ borderBottom: '2px solid #ddd', paddingBottom: '8px', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 'bold' }}>Akun</span>
                                    <div style={{ display: 'flex', gap: '24px' }}>
                                        <span style={{ fontWeight: 'bold', width: '100px', textAlign: 'right' }}>Debit</span>
                                        <span style={{ fontWeight: 'bold', width: '100px', textAlign: 'right' }}>Kredit</span>
                                    </div>
                                </div>

                                {report.accounts.map(item => (
                                    <div key={item.accountCode} className="report-row">
                                        <span>{item.accountCode} - {item.accountName}</span>
                                        <div style={{ display: 'flex', gap: '24px' }}>
                                            <span style={{ width: '100px', textAlign: 'right' }}>
                                                {item.debit > 0 ? formatCurrency(item.debit).replace('Rp', '') : '-'}
                                            </span>
                                            <span style={{ width: '100px', textAlign: 'right' }}>
                                                {item.credit > 0 ? formatCurrency(item.credit).replace('Rp', '') : '-'}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <div className="report-row total">
                                    <span>Total</span>
                                    <div style={{ display: 'flex', gap: '24px' }}>
                                        <span style={{ width: '100px', textAlign: 'right' }}>
                                            {formatCurrency(report.totalDebit).replace('Rp', '')}
                                        </span>
                                        <span style={{ width: '100px', textAlign: 'right' }}>
                                            {formatCurrency(report.totalCredit).replace('Rp', '')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style jsx>{`
                .report-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #f0f0f0; }
                .report-row.header { background-color: #f9f9f9; padding: 12px 8px; }
                .report-row.total { font-weight: 700; border-top: 2px solid #ddd; border-bottom: 2px solid #ddd; padding: 12px 0; margin-top: 16px; }
                
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
