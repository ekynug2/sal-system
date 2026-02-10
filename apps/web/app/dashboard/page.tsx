'use client';

// =============================================================================
// SAL Accounting System - Dashboard Page
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { formatCurrency, formatNumber, formatDate, apiGet } from '@/lib/api-client';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Users,
    FileText,
    ArrowUpRight,
    Clock,
    Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardStats {
    totalSalesThisMonth: number;
    salesGrowth: number;
    outstandingReceivables: number;
    receivablesChange: number;
    inventoryValue: number;
    inventoryChange: number;
    activeCustomers: number;
    customersChange: number;
}

interface RecentInvoice {
    id: number;
    invoiceNo: string;
    customerName: string;
    invoiceDate: string;
    grandTotal: number;
    status: string;
}

interface LowStockItem {
    itemId: number;
    name: string;
    sku: string;
    stock: number;
    minStock: number;
}

interface DashboardData {
    stats: DashboardStats;
    recentInvoices: RecentInvoice[];
    lowStockItems: LowStockItem[];
}

function useDashboard() {
    return useQuery({
        queryKey: ['dashboard'],
        queryFn: () => apiGet<DashboardData>('/dashboard'),
        refetchInterval: 60000, // Refresh every minute
    });
}

/**
 * Render the main dashboard page for authenticated users.
 *
 * Displays KPI stat cards, recent invoices, low-stock alerts, and quick action buttons.
 * If the user is not authenticated it redirects to the login page; while authentication is loading it shows a centered spinner.
 *
 * @returns The dashboard page React element containing statistics, recent activity tables/lists, and quick action controls.
 */
export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { data, isLoading, error } = useDashboard();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || !user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    const stats = data?.stats;
    const recentInvoices = data?.recentInvoices || [];
    const lowStockItems = data?.lowStockItems || [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dasbor</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Selamat datang kembali, {user.fullName}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <Clock size={16} />
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Stats Grid */}
                {isLoading ? (
                    <div className="stats-grid">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="stat-card" style={{ minHeight: 120 }}>
                                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 'var(--space-3)' }} />
                                <div className="skeleton" style={{ height: 32, width: '80%' }} />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--accent-red)' }}>
                        Gagal memuat data dasbor. Silakan coba lagi.
                    </div>
                ) : (
                    <div className="stats-grid">
                        <StatCard
                            label="Total Penjualan (Bulan Ini)"
                            value={formatCurrency(stats?.totalSalesThisMonth || 0)}
                            change={stats?.salesGrowth || 0}
                            icon={<DollarSign size={24} />}
                            color="var(--primary-500)"
                        />
                        <StatCard
                            label="Piutang Belum Lunas"
                            value={formatCurrency(stats?.outstandingReceivables || 0)}
                            change={stats?.receivablesChange || 0}
                            icon={<FileText size={24} />}
                            color="var(--accent-yellow)"
                        />
                        <StatCard
                            label="Nilai Inventaris"
                            value={formatCurrency(stats?.inventoryValue || 0)}
                            change={stats?.inventoryChange || 0}
                            icon={<Package size={24} />}
                            color="var(--accent-green)"
                        />
                        <StatCard
                            label="Pelanggan Aktif"
                            value={formatNumber(stats?.activeCustomers || 0)}
                            change={stats?.customersChange || 0}
                            icon={<Users size={24} />}
                            color="var(--accent-purple)"
                        />
                    </div>
                )}

                {/* Recent Activity */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Faktur Terbaru</h3>
                            <button
                                className="btn btn-ghost"
                                style={{ fontSize: '0.875rem' }}
                                onClick={() => router.push('/sales/invoices')}
                            >
                                Lihat Semua <ArrowUpRight size={14} />
                            </button>
                        </div>
                        {isLoading ? (
                            <div style={{ padding: 'var(--space-4)' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="skeleton" style={{ height: 40, marginBottom: 'var(--space-2)' }} />
                                ))}
                            </div>
                        ) : recentInvoices.length === 0 ? (
                            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Tidak ada faktur terbaru
                            </div>
                        ) : (
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No. Faktur</th>
                                            <th>Pelanggan</th>
                                            <th>Tanggal</th>
                                            <th>Jumlah</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentInvoices.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => router.push(`/sales/invoices/${inv.id}`)}
                                            >
                                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{inv.invoiceNo}</td>
                                                <td>{inv.customerName}</td>
                                                <td>{formatDate(inv.invoiceDate)}</td>
                                                <td className="money">{formatCurrency(inv.grandTotal)}</td>
                                                <td>
                                                    <span className={`badge badge-${inv.status.toLowerCase().replace('_', '-')}`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Peringatan Stok Rendah</h3>
                        </div>
                        {isLoading ? (
                            <div style={{ padding: 'var(--space-4)' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="skeleton" style={{ height: 60, marginBottom: 'var(--space-2)' }} />
                                ))}
                            </div>
                        ) : lowStockItems.length === 0 ? (
                            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Tidak ada barang stok rendah
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {lowStockItems.map((item) => (
                                    <div
                                        key={item.itemId}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 'var(--space-3)',
                                            background: 'var(--accent-red-light)',
                                            borderRadius: 'var(--radius-md)',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                Min: {item.minStock}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{item.stock}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>pcs</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Aksi Cepat</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => router.push('/sales/invoices/new')}>
                            <FileText size={18} />
                            Faktur Baru
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/purchases/receipts/new')}>
                            <Package size={18} />
                            Terima Barang
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/sales/payments/new')}>
                            <DollarSign size={18} />
                            Terima Pembayaran
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/reports')}>
                            <TrendingUp size={18} />
                            Lihat Laporan
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

/**
 * Renders a dashboard statistic card showing a label, primary value, optional percentage change, and an icon.
 *
 * @param label - The metric label shown above the value (e.g., "Total Penjualan (Bulan Ini)")
 * @param value - The displayed value as a preformatted string (e.g., formatted currency or number)
 * @param change - Percentage change relative to the previous period; positive values render an "up" indicator, negative values render a "down" indicator; zero hides the change row
 * @param icon - Icon node displayed inside the colored circular area
 * @param color - CSS color used for the icon foreground and a translucent background (e.g., hex, rgb, or CSS color token)
 * @returns The rendered stat card element
 */
function StatCard({
    label,
    value,
    change,
    icon,
    color,
}: {
    label: string;
    value: string;
    change: number;
    icon: React.ReactNode;
    color: string;
}) {
    const isPositive = change >= 0;

    return (
        <div className="stat-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{value}</div>
                    {change !== 0 && (
                        <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
                            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(change)}% vs bulan lalu
                        </div>
                    )}
                </div>
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 'var(--radius-lg)',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                    }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}