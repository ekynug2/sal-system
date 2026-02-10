'use client';

import { Sidebar } from '@/ui/components/sidebar';
import Link from 'next/link';
import {
    BarChart3,
    TrendingUp,
    PieChart,
    FileText,
    Calendar,
    ArrowRight
} from 'lucide-react';

/**
 * Render the Reports page with grouped report cards for navigation.
 *
 * Displays a sidebar and a main content area that lists report groups; each group shows a title, description, and a grid of clickable report cards linking to specific report pages.
 *
 * @returns A React element representing the reports dashboard with grouped, navigable report cards.
 */
export default function ReportsPage() {
    const reportGroups = [
        {
            title: 'Laporan Keuangan',
            description: 'Laporan keuangan utama untuk bisnis Anda',
            items: [
                { title: 'Laba Rugi', href: '/reports/pnl', icon: <TrendingUp size={24} />, description: 'Pendapatan, pengeluaran, dan laba bersih selama periode tertentu.' },
                { title: 'Neraca', href: '/reports/balance-sheet', icon: <PieChart size={24} />, description: 'Aset, kewajiban, dan ekuitas pada tanggal tertentu.' },
                { title: 'Neraca Saldo', href: '/reports/trial-balance', icon: <BarChart3 size={24} />, description: 'Daftar semua saldo akun untuk memastikan debit sama dengan kredit.' },
            ]
        },
        {
            title: 'Penjualan & Piutang',
            description: 'Analisis pelanggan dan penjualan',
            items: [
                { title: 'Laporan Penjualan', href: '/reports/sales', icon: <FileText size={24} />, description: 'Riwayat penjualan terperinci berdasarkan pelanggan atau barang.' },
                { title: 'Umur Piutang (AR)', href: '/reports/ar-aging', icon: <Calendar size={24} />, description: 'Faktur pelanggan yang belum dibayar dikategorikan berdasarkan hari keterlambatan.' },
            ]
        },
        {
            title: 'Pembelian & Hutang',
            description: 'Pelacakan pemasok dan pengeluaran',
            items: [
                { title: 'Laporan Pembelian', href: '/reports/purchases', icon: <FileText size={24} />, description: 'Riwayat pembelian berdasarkan pemasok atau barang.' },
                { title: 'Umur Hutang (AP)', href: '/reports/ap-aging', icon: <Calendar size={24} />, description: 'Tagihan yang belum dibayar dikategorikan berdasarkan hari keterlambatan.' },
            ]
        },
        {
            title: 'Persediaan',
            description: 'Level stok dan penilaian',
            items: [
                { title: 'Nilai Persediaan', href: '/reports/inventory', icon: <BarChart3 size={24} />, description: 'Nilai stok saat ini.' },
            ]
        }
    ];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Laporan</h1>
                    <p className="text-gray-500">Akses dan buat laporan untuk wawasan bisnis Anda.</p>
                </div>

                <div className="grid gap-8">
                    {reportGroups.map((group) => (
                        <div key={group.title}>
                            <h2 className="text-xl font-bold mb-2 text-gray-800">{group.title}</h2>
                            <p className="text-gray-500 mb-4">{group.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.items.map((item) => (
                                    <Link key={item.href} href={item.href} className="report-card">
                                        <div className="p-6 h-full flex flex-col">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="p-3 bg-primary-50 text-primary-600 rounded-lg">
                                                    {item.icon}
                                                </div>
                                                <ArrowRight size={20} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                            <p className="text-sm text-gray-500">{item.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <style jsx>{`
                .report-card {
                    background: white;
                    border: 1px solid #eaeaea;
                    border-radius: 8px;
                    transition: all 0.2s;
                    display: block;
                    text-decoration: none;
                    color: inherit;
                }
                .report-card:hover {
                    border-color: var(--primary-500);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}