// =============================================================================
// SAL Accounting System - Dashboard Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query } from '../db';

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

export interface DashboardData {
    stats: DashboardStats;
    recentInvoices: RecentInvoice[];
    lowStockItems: LowStockItem[];
}

export async function getDashboardData(): Promise<DashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total Sales This Month
    const [salesThisMonth] = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(grand_total), 0) as total 
         FROM sales_invoices 
         WHERE status IN ('POSTED', 'PARTIALLY_PAID', 'PAID') 
         AND invoice_date >= ?`,
        [startOfMonth.toISOString().split('T')[0]]
    );

    // Total Sales Last Month
    const [salesLastMonth] = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(grand_total), 0) as total 
         FROM sales_invoices 
         WHERE status IN ('POSTED', 'PARTIALLY_PAID', 'PAID') 
         AND invoice_date >= ? AND invoice_date <= ?`,
        [startOfLastMonth.toISOString().split('T')[0], endOfLastMonth.toISOString().split('T')[0]]
    );

    const totalSalesThisMonth = Number(salesThisMonth?.total || 0);
    const totalSalesLastMonth = Number(salesLastMonth?.total || 0);
    const salesGrowth = totalSalesLastMonth > 0
        ? ((totalSalesThisMonth - totalSalesLastMonth) / totalSalesLastMonth) * 100
        : 0;

    // Outstanding Receivables
    const [arTotal] = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(balance_due), 0) as total 
         FROM sales_invoices 
         WHERE status IN ('POSTED', 'PARTIALLY_PAID') AND balance_due > 0`
    );

    // Inventory Value
    const [invValue] = await query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(stock_value), 0) as total FROM item_stock`
    );

    // Active Customers (with transactions in last 90 days)
    const [activeCustomersResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT customer_id) as cnt 
         FROM sales_invoices 
         WHERE invoice_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)`
    );

    // Recent Invoices
    const recentInvoiceRows = await query<RowDataPacket[]>(
        `SELECT si.id, si.invoice_no, c.name as customer_name, si.invoice_date, si.grand_total, si.status
         FROM sales_invoices si
         INNER JOIN customers c ON c.id = si.customer_id
         ORDER BY si.created_at DESC
         LIMIT 5`
    );

    // Low Stock Items
    const lowStockRows = await query<RowDataPacket[]>(
        `SELECT i.id as item_id, i.name, i.sku, COALESCE(ist.on_hand, 0) as stock, i.min_stock
         FROM items i
         LEFT JOIN item_stock ist ON ist.item_id = i.id
         WHERE i.is_active = 1 AND i.track_inventory = 1 AND i.min_stock > 0
         AND COALESCE(ist.on_hand, 0) < i.min_stock
         ORDER BY (COALESCE(ist.on_hand, 0) / i.min_stock) ASC
         LIMIT 5`
    );

    return {
        stats: {
            totalSalesThisMonth,
            salesGrowth: Math.round(salesGrowth * 10) / 10,
            outstandingReceivables: Number(arTotal?.total || 0),
            receivablesChange: 0, // Would need historical data
            inventoryValue: Number(invValue?.total || 0),
            inventoryChange: 0,
            activeCustomers: Number(activeCustomersResult?.cnt || 0),
            customersChange: 0,
        },
        recentInvoices: recentInvoiceRows.map(r => ({
            id: r.id,
            invoiceNo: r.invoice_no,
            customerName: r.customer_name,
            invoiceDate: r.invoice_date,
            grandTotal: Number(r.grand_total),
            status: r.status,
        })),
        lowStockItems: lowStockRows.map(r => ({
            itemId: r.item_id,
            name: r.name,
            sku: r.sku,
            stock: Number(r.stock),
            minStock: Number(r.min_stock),
        })),
    };
}
