'use client';

// =============================================================================
// SAL Accounting System - Inventory Stock On Hand Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useStockOnHand } from '@/hooks/use-inventory';
import { formatCurrency, formatNumber } from '@/lib/api-client';
import {
    Package,
    Search,
    Download,
    AlertTriangle,
    Loader2,
    ArrowUpDown,
} from 'lucide-react';

export default function StockOnHandPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'sku' | 'onHand' | 'value'>('sku');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const { data: stockData, isLoading, error } = useStockOnHand();

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

    let stock = stockData || [];

    // Filter
    if (search) {
        const searchLower = search.toLowerCase();
        stock = stock.filter(
            (item) =>
                item.itemSku.toLowerCase().includes(searchLower) ||
                item.itemName.toLowerCase().includes(searchLower)
        );
    }

    // Sort
    stock = [...stock].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'sku') {
            comparison = a.itemSku.localeCompare(b.itemSku);
        } else if (sortBy === 'onHand') {
            comparison = a.onHand - b.onHand;
        } else if (sortBy === 'value') {
            comparison = a.stockValue - b.stockValue;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const totalValue = stock.reduce((sum, item) => sum + item.stockValue, 0);
    const lowStockItems = stock.filter((item) => item.onHand < 10);

    function toggleSort(column: typeof sortBy) {
        if (sortBy === column) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Stock On Hand</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Real-time inventory levels and valuation
                        </p>
                    </div>
                    <button className="btn btn-secondary">
                        <Download size={18} />
                        Export
                    </button>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-label">Total SKUs</div>
                        <div className="stat-value">{formatNumber(stock.length)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Inventory Value</div>
                        <div className="stat-value">{formatCurrency(totalValue)}</div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: lowStockItems.length > 0 ? '4px solid var(--accent-red)' : undefined }}>
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {lowStockItems.length > 0 && <AlertTriangle size={16} color="var(--accent-red)" />}
                            Low Stock Items
                        </div>
                        <div className="stat-value" style={{ color: lowStockItems.length > 0 ? 'var(--accent-red)' : 'inherit' }}>
                            {lowStockItems.length}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                    <div style={{ position: 'relative', maxWidth: 400 }}>
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
                            placeholder="Search by SKU or item name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 42 }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>Loading stock...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--accent-red)' }}>
                            Failed to load stock data. Please try again.
                        </div>
                    ) : stock.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Package size={48} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                            <h3 style={{ marginTop: 'var(--space-4)' }}>No items found</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                {search ? 'Try adjusting your search' : 'Add items to track inventory'}
                            </p>
                        </div>
                    ) : (
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => toggleSort('sku')} style={{ cursor: 'pointer' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                SKU
                                                {sortBy === 'sku' && <ArrowUpDown size={14} />}
                                            </span>
                                        </th>
                                        <th>Item Name</th>
                                        <th onClick={() => toggleSort('onHand')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                                On Hand
                                                {sortBy === 'onHand' && <ArrowUpDown size={14} />}
                                            </span>
                                        </th>
                                        <th style={{ textAlign: 'right' }}>On Order</th>
                                        <th style={{ textAlign: 'right' }}>Committed</th>
                                        <th style={{ textAlign: 'right' }}>Available</th>
                                        <th style={{ textAlign: 'right' }}>Avg Cost</th>
                                        <th onClick={() => toggleSort('value')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                                Value
                                                {sortBy === 'value' && <ArrowUpDown size={14} />}
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stock.map((item) => (
                                        <tr
                                            key={item.itemId}
                                            style={{
                                                background: item.onHand < 10 ? 'var(--accent-red-light)' : undefined,
                                            }}
                                        >
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{item.itemSku}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    {item.itemName}
                                                    {item.onHand < 10 && (
                                                        <AlertTriangle size={14} color="var(--accent-red)" />
                                                    )}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    textAlign: 'right',
                                                    fontWeight: 600,
                                                    color: item.onHand < 10 ? 'var(--accent-red)' : 'inherit',
                                                }}
                                            >
                                                {formatNumber(item.onHand)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {formatNumber(item.onOrder)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                {formatNumber(item.committed)}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatNumber(item.available)}</td>
                                            <td className="money" style={{ textAlign: 'right' }}>
                                                {formatCurrency(item.avgCost)}
                                            </td>
                                            <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                {formatCurrency(item.stockValue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                                        <th colSpan={7} style={{ textAlign: 'right', fontWeight: 600 }}>
                                            Total Value:
                                        </th>
                                        <th className="money" style={{ textAlign: 'right', fontWeight: 700 }}>
                                            {formatCurrency(totalValue)}
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
