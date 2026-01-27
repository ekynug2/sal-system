'use client';

// =============================================================================
// SAL Accounting System - Dashboard Page
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { formatCurrency, formatNumber, apiGet } from '@/lib/api-client';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Users,
    FileText,
    ArrowUpRight,
    Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || !user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="skeleton" style={{ width: 200, height: 40 }} />
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Welcome back, {user.fullName}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <Clock size={16} />
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <StatCard
                        label="Total Sales (This Month)"
                        value={formatCurrency(125000000)}
                        change={12.5}
                        icon={<DollarSign size={24} />}
                        color="var(--primary-500)"
                    />
                    <StatCard
                        label="Outstanding Receivables"
                        value={formatCurrency(45000000)}
                        change={-5.2}
                        icon={<FileText size={24} />}
                        color="var(--accent-yellow)"
                    />
                    <StatCard
                        label="Inventory Value"
                        value={formatCurrency(89000000)}
                        change={3.8}
                        icon={<Package size={24} />}
                        color="var(--accent-green)"
                    />
                    <StatCard
                        label="Active Customers"
                        value={formatNumber(156)}
                        change={8}
                        icon={<Users size={24} />}
                        color="var(--accent-purple)"
                    />
                </div>

                {/* Recent Activity */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Invoices</h3>
                            <button className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                                View All <ArrowUpRight size={14} />
                            </button>
                        </div>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { no: 'INV26000001', customer: 'Restoran Sederhana', date: '27 Jan 2026', amount: 12500000, status: 'POSTED' },
                                        { no: 'INV26000002', customer: 'Hotel Bintang Lima', date: '26 Jan 2026', amount: 45000000, status: 'PARTIALLY_PAID' },
                                        { no: 'INV26000003', customer: 'Toko Sembako Jaya', date: '25 Jan 2026', amount: 8750000, status: 'PAID' },
                                        { no: 'INV26000004', customer: 'Warung Bu Siti', date: '24 Jan 2026', amount: 3200000, status: 'DRAFT' },
                                    ].map((inv) => (
                                        <tr key={inv.no}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{inv.no}</td>
                                            <td>{inv.customer}</td>
                                            <td>{inv.date}</td>
                                            <td className="money">{formatCurrency(inv.amount)}</td>
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
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Low Stock Alert</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {[
                                { name: 'Beras Premium 5kg', stock: 12, min: 50 },
                                { name: 'Minyak Goreng 2L', stock: 25, min: 100 },
                                { name: 'Gula Pasir 1kg', stock: 45, min: 100 },
                            ].map((item) => (
                                <div
                                    key={item.name}
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
                                            Min: {item.min}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{item.stock}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>pcs</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                    <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => router.push('/sales/invoices/new')}>
                            <FileText size={18} />
                            New Invoice
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/purchases/receipts/new')}>
                            <Package size={18} />
                            Receive Items
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/sales/payments/new')}>
                            <DollarSign size={18} />
                            Receive Payment
                        </button>
                        <button className="btn btn-secondary" onClick={() => router.push('/reports/sales')}>
                            <TrendingUp size={18} />
                            View Reports
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

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
                    <div className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(change)}% vs last month
                    </div>
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
