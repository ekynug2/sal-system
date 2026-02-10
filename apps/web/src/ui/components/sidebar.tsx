'use client';

// =============================================================================
// SAL Accounting System - Sidebar Component
// =============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Package,
    ShoppingCart,
    Receipt,
    Users,
    Truck,
    BarChart3,
    Settings,
    BookOpen,
    CreditCard,
    LogOut,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '../providers/auth-provider';
import { useState } from 'react';

interface NavItem {
    label: string;
    href?: string;
    icon: React.ReactNode;
    permission?: string;
    children?: { label: string; href: string; permission?: string }[];
}

const navItems: NavItem[] = [
    {
        label: 'Dasbor',
        href: '/dashboard',
        icon: <LayoutDashboard size={20} />,
        permission: 'DASHBOARD_VIEW',
    },
    {
        label: 'Penjualan',
        icon: <FileText size={20} />,
        children: [
            { label: 'Faktur', href: '/sales/invoices', permission: 'SALES_INVOICE_VIEW' },
            { label: 'Pembayaran', href: '/sales/payments', permission: 'SALES_PAYMENT_VIEW' },
            { label: 'Nota Kredit', href: '/sales/credit-notes', permission: 'SALES_CREDIT_NOTE_VIEW' },
        ],
    },
    {
        label: 'Pembelian',
        icon: <ShoppingCart size={20} />,
        children: [
            { label: 'Penerimaan Barang', href: '/purchases/receipts', permission: 'PURCHASE_RECEIPT_VIEW' },
            { label: 'Tagihan', href: '/purchases/bills', permission: 'PURCHASE_BILL_VIEW' },
            { label: 'Pembayaran', href: '/purchases/payments', permission: 'PURCHASE_PAYMENT_VIEW' },
        ],
    },
    {
        label: 'Inventaris',
        icon: <Package size={20} />,
        children: [
            { label: 'Stok Tersedia', href: '/inventory/stock', permission: 'INVENTORY_VIEW' },
            { label: 'Buku Besar Stok', href: '/inventory/ledger', permission: 'INVENTORY_VIEW' },
            { label: 'Penyesuaian', href: '/inventory/adjustments', permission: 'INVENTORY_VIEW' },
            { label: 'Stok Opname', href: '/inventory/opname', permission: 'INVENTORY_OPNAME_CREATE' },
        ],
    },
    {
        label: 'Pelanggan',
        href: '/customers',
        icon: <Users size={20} />,
        permission: 'CUSTOMER_VIEW',
    },
    {
        label: 'Pemasok',
        href: '/suppliers',
        icon: <Truck size={20} />,
        permission: 'SUPPLIER_VIEW',
    },
    {
        label: 'Barang',
        href: '/items',
        icon: <Receipt size={20} />,
        permission: 'ITEM_VIEW',
    },
    {
        label: 'Akuntansi',
        icon: <BookOpen size={20} />,
        children: [
            { label: 'Jurnal Umum', href: '/accounting/journals', permission: 'JOURNAL_VIEW' },
            { label: 'Bagan Akun', href: '/accounting/coa', permission: 'COA_VIEW' },
        ],
    },
    {
        label: 'Laporan',
        icon: <BarChart3 size={20} />,
        children: [
            { label: 'Laporan Penjualan', href: '/reports/sales', permission: 'REPORT_SALES' },
            { label: 'Umur Piutang', href: '/reports/ar-aging', permission: 'REPORT_AR_AGING' },
            { label: 'Umur Hutang', href: '/reports/ap-aging', permission: 'REPORT_AP_AGING' },
            { label: 'Nilai Inventaris', href: '/reports/inventory', permission: 'REPORT_INVENTORY' },
            { label: 'Laba Rugi', href: '/reports/pnl', permission: 'REPORT_PNL' },
            { label: 'Neraca', href: '/reports/balance-sheet', permission: 'REPORT_BALANCE_SHEET' },
            { label: 'Neraca Saldo', href: '/reports/trial-balance', permission: 'REPORT_TRIAL_BALANCE' },
        ],
    },
    {
        label: 'Pengaturan',
        href: '/settings',
        icon: <Settings size={20} />,
        permission: 'SETTINGS_VIEW',
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout, hasPermission } = useAuth();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleExpand = (label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label)
                ? prev.filter((item) => item !== label)
                : [...prev, label]
        );
    };

    const filteredNavItems = navItems.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) return false;
        if (item.children) {
            item.children = item.children.filter(
                (child) => !child.permission || hasPermission(child.permission)
            );
            return item.children.length > 0;
        }
        return true;
    });

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <CreditCard size={28} />
                <span>SAL System</span>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Menu Utama</div>
                    {filteredNavItems.slice(0, 5).map((item) => (
                        <NavItemComponent
                            key={item.label}
                            item={item}
                            pathname={pathname}
                            expanded={expandedItems.includes(item.label)}
                            onToggle={() => toggleExpand(item.label)}
                        />
                    ))}
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-section-title">Data Master</div>
                    {filteredNavItems.slice(5, 8).map((item) => (
                        <NavItemComponent
                            key={item.label}
                            item={item}
                            pathname={pathname}
                            expanded={expandedItems.includes(item.label)}
                            onToggle={() => toggleExpand(item.label)}
                        />
                    ))}
                </div>

                <div className="sidebar-section">
                    <div className="sidebar-section-title">Keuangan</div>
                    {filteredNavItems.slice(8).map((item) => (
                        <NavItemComponent
                            key={item.label}
                            item={item}
                            pathname={pathname}
                            expanded={expandedItems.includes(item.label)}
                            onToggle={() => toggleExpand(item.label)}
                        />
                    ))}
                </div>
            </nav>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--primary-500)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                        }}
                    >
                        {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{user?.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                            {user?.roles[0]?.name}
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="sidebar-link"
                    style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                    <LogOut size={20} />
                    Keluar
                </button>
            </div>
        </aside>
    );
}

function NavItemComponent({
    item,
    pathname,
    expanded,
    onToggle,
}: {
    item: NavItem;
    pathname: string;
    expanded: boolean;
    onToggle: () => void;
}) {
    const isActive = item.href === pathname || item.children?.some((c) => pathname.startsWith(c.href));

    if (item.children) {
        return (
            <div>
                <button
                    onClick={onToggle}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    style={{
                        width: '100%',
                        border: 'none',
                        background: isActive ? 'var(--primary-500)' : 'transparent',
                        cursor: 'pointer',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {item.icon}
                        {item.label}
                    </span>
                    <ChevronDown
                        size={16}
                        style={{
                            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s',
                        }}
                    />
                </button>
                {expanded && (
                    <div style={{ marginLeft: '2rem', marginTop: '0.25rem' }}>
                        {item.children.map((child) => (
                            <Link
                                key={child.href}
                                href={child.href}
                                className={`sidebar-link ${pathname === child.href ? 'active' : ''}`}
                                style={{ fontSize: '0.875rem' }}
                            >
                                {child.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link href={item.href!} className={`sidebar-link ${isActive ? 'active' : ''}`}>
            {item.icon}
            {item.label}
        </Link>
    );
}
