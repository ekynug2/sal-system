// =============================================================================
// SAL Accounting System - Report Service
// =============================================================================

import { query } from '../db';
import { RowDataPacket } from 'mysql2';
import type { ProfitLossReport, BalanceSheet, TrialBalance, InventoryValuationReport, SalesSummary, ARAgingReport, APAgingReport } from '../../shared/types';

interface GLRow extends RowDataPacket {
    account_id: number;
    account_code: string;
    account_name: string;
    account_type: string;
    total_debit: number;
    total_credit: number;
}

export async function getProfitLoss(params: {
    startDate: string;
    endDate: string;
}): Promise<ProfitLossReport> {
    // Basic PnL Logic:
    // 1. Get all journal lines within period for INCOME, COGS, EXPENSE accounts
    // 2. Aggregate by account

    const rows = await query<GLRow[]>(
        `SELECT 
            coa.id as account_id,
            coa.account_code,
            coa.account_name,
            at.code as account_type,
            COALESCE(SUM(CASE WHEN jl.dc = 'D' THEN jl.amount ELSE 0 END), 0) as total_debit,
            COALESCE(SUM(CASE WHEN jl.dc = 'C' THEN jl.amount ELSE 0 END), 0) as total_credit
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.journal_entry_id
         join chart_of_accounts coa ON coa.id = jl.account_id
         JOIN account_types at ON at.code = coa.account_type_code
         WHERE je.entry_date >= ? AND je.entry_date <= ?
           AND at.code IN ('INCOME', 'COGS', 'EXPENSE')
         GROUP BY coa.id, coa.account_code, coa.account_name, at.code
         ORDER BY coa.account_code`,
        [params.startDate, params.endDate]
    );

    const report: ProfitLossReport = {
        periodFrom: params.startDate,
        periodTo: params.endDate,
        income: [],
        totalIncome: 0,
        cogs: [],
        totalCogs: 0,
        grossProfit: 0,
        expenses: [],
        totalExpenses: 0,
        netIncome: 0,
    };

    for (const row of rows) {
        const debit = Number(row.total_debit);
        const credit = Number(row.total_credit);

        if (row.account_type === 'INCOME') {
            const amount = credit - debit;
            report.income.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                amount
            });
            report.totalIncome += amount;
        } else if (row.account_type === 'COGS') {
            const amount = debit - credit;
            report.cogs.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                amount
            });
            report.totalCogs += amount;
        } else if (row.account_type === 'EXPENSE') {
            const amount = debit - credit;
            report.expenses.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                amount
            });
            report.totalExpenses += amount;
        }
    }

    report.grossProfit = report.totalIncome - report.totalCogs;
    report.netIncome = report.grossProfit - report.totalExpenses;

    return report;
}

export async function getBalanceSheet(params: {
    asOf: string;
}): Promise<BalanceSheet> {
    // Basic Balance Sheet Logic:
    // 1. Get cumulative balance of ASSET, LIABILITY, EQUITY accounts up to asOf date
    // 2. Calculate Net Income (Retained Earnings) separately

    const rows = await query<GLRow[]>(
        `SELECT 
            coa.id as account_id,
            coa.account_code,
            coa.account_name,
            at.code as account_type,
            COALESCE(SUM(CASE WHEN jl.dc = 'D' THEN jl.amount ELSE 0 END), 0) as total_debit,
            COALESCE(SUM(CASE WHEN jl.dc = 'C' THEN jl.amount ELSE 0 END), 0) as total_credit
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.journal_entry_id
         JOIN chart_of_accounts coa ON coa.id = jl.account_id
         JOIN account_types at ON at.code = coa.account_type_code
         WHERE je.entry_date <= ?
         GROUP BY coa.id, coa.account_code, coa.account_name, at.code
         ORDER BY coa.account_code`,
        [params.asOf]
    );

    const report: BalanceSheet = {
        asOf: params.asOf,
        assets: [],
        totalAssets: 0,
        liabilities: [],
        totalLiabilities: 0,
        equity: [],
        totalEquity: 0,
    };

    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of rows) {
        const debit = Number(row.total_debit);
        const credit = Number(row.total_credit);
        const net = debit - credit;

        if (['ASSET', 'BANK', 'RECEIVABLE', 'INVENTORY', 'FIXED_ASSET'].includes(row.account_type)) {
            // Asset: Debit is +
            const balance = net;
            report.assets.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                balance,
                isHeader: false
            });
            report.totalAssets += balance;
        } else if (['LIABILITY', 'PAYABLE', 'CREDIT_CARD', 'LONG_TERM_LIABILITY'].includes(row.account_type)) {
            // Liability: Credit is +
            const balance = -net;
            report.liabilities.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                balance,
                isHeader: false
            });
            report.totalLiabilities += balance;
        } else if (['EQUITY'].includes(row.account_type)) {
            // Equity: Credit is +
            const balance = -net;
            report.equity.push({
                accountCode: row.account_code,
                accountName: row.account_name,
                balance,
                isHeader: false
            });
            report.totalEquity += balance;
        } else if (['INCOME', 'OTHER_INCOME'].includes(row.account_type)) {
            totalIncome += (credit - debit);
        } else if (['EXPENSE', 'COGS', 'OTHER_EXPENSE'].includes(row.account_type)) {
            totalExpense += (debit - credit);
        }
    }

    // Add Net Income to Equity
    const netIncome = totalIncome - totalExpense;
    report.equity.push({
        accountCode: '9999',
        accountName: 'Current Earnings',
        balance: netIncome,
        isHeader: false
    });
    report.totalEquity += netIncome;

    return report;
}

export async function getTrialBalance(params: {
    asOf: string;
}): Promise<TrialBalance> {
    const rows = await query<GLRow[]>(
        `SELECT 
            coa.account_code,
            coa.account_name,
            at.code as account_type,
            COALESCE(SUM(CASE WHEN jl.dc = 'D' THEN jl.amount ELSE 0 END), 0) as total_debit,
            COALESCE(SUM(CASE WHEN jl.dc = 'C' THEN jl.amount ELSE 0 END), 0) as total_credit
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.journal_entry_id
         JOIN chart_of_accounts coa ON coa.id = jl.account_id
         JOIN account_types at ON at.code = coa.account_type_code
         WHERE je.entry_date <= ?
         GROUP BY coa.account_code, coa.account_name, at.code
         HAVING total_debit > 0 OR total_credit > 0
         ORDER BY coa.account_code`,
        [params.asOf]
    );

    const report: TrialBalance = {
        asOf: params.asOf,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0
    };

    for (const row of rows) {
        const debit = Number(row.total_debit);
        const credit = Number(row.total_credit);
        const net = debit - credit;

        // Trial balance typically shows just the net debit or credit column, 
        // or effectively the sum of debits vs sum of credits for that account?
        // Usually TB shows ending balance. If Debit balance, show in Debit col. 

        let rowDebit = 0;
        let rowCredit = 0;

        if (net > 0) rowDebit = net;
        else rowCredit = -net;

        report.accounts.push({
            accountCode: row.account_code,
            accountName: row.account_name,
            accountType: row.account_type,
            debit: rowDebit,
            credit: rowCredit
        });

        report.totalDebit += rowDebit;
        report.totalCredit += rowCredit;
    }

    return report;
}

export async function getSalesReport(params: {
    startDate: string;
    endDate: string;
}): Promise<SalesSummary> {
    const rows = await query<RowDataPacket[]>(
        `SELECT 
            COUNT(si.id) as invoice_count,
            COALESCE(SUM(si.grand_total), 0) as total_sales,
            COALESCE(SUM(lines_cogs.total_cost), 0) as total_cogs
         FROM sales_invoices si
         LEFT JOIN (
            SELECT invoice_id, SUM(qty * unit_cost) as total_cost
            FROM sales_invoice_lines
            GROUP BY invoice_id
         ) lines_cogs ON lines_cogs.invoice_id = si.id
         WHERE si.invoice_date >= ? AND si.invoice_date <= ? AND si.status != 'VOIDED'`,
        [params.startDate, params.endDate]
    );

    const row = rows[0];
    const totalSales = Number(row.total_sales);
    const totalCogs = Number(row.total_cogs);

    return {
        period: `${params.startDate} - ${params.endDate}`,
        totalSales,
        totalCogs,
        grossProfit: totalSales - totalCogs,
        invoiceCount: Number(row.invoice_count)
    };
}

export async function getARAging(params: {
    asOf: string;
}): Promise<ARAgingReport[]> {
    // 1. Get all posted invoices that are not fully paid
    const rows = await query<RowDataPacket[]>(
        `SELECT 
            si.id, si.invoice_no, si.invoice_date, si.due_date, si.grand_total, si.balance_due,
            c.id as customer_id, c.customer_code, c.name as customer_name,
            DATEDIFF(?, si.due_date) as days_overdue
         FROM sales_invoices si
         JOIN customers c ON c.id = si.customer_id
         WHERE si.status IN ('POSTED', 'PARTIALLY_PAID')
           AND si.balance_due > 0
           AND si.invoice_date <= ?
         ORDER BY c.name, si.due_date`,
        [params.asOf, params.asOf]
    );

    const reportMap = new Map<number, ARAgingReport>();

    for (const row of rows) {
        const customerId = row.customer_id;
        if (!reportMap.has(customerId)) {
            reportMap.set(customerId, {
                customerId,
                customerCode: row.customer_code,
                customerName: row.customer_name,
                aging: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 },
                invoices: []
            });
        }

        const report = reportMap.get(customerId)!;
        const balanceDue = Number(row.balance_due);
        const daysOverdue = Number(row.days_overdue);

        report.invoices.push({
            invoiceNo: row.invoice_no,
            invoiceDate: row.invoice_date,
            dueDate: row.due_date,
            grandTotal: Number(row.grand_total),
            balanceDue,
            daysPastDue: daysOverdue > 0 ? daysOverdue : 0
        });

        report.aging.total += balanceDue;

        if (daysOverdue <= 0) {
            report.aging.current += balanceDue;
        } else if (daysOverdue <= 30) {
            report.aging.days1_30 += balanceDue;
        } else if (daysOverdue <= 60) {
            report.aging.days31_60 += balanceDue;
        } else if (daysOverdue <= 90) {
            report.aging.days61_90 += balanceDue;
        } else {
            report.aging.over90 += balanceDue;
        }
    }

    return Array.from(reportMap.values());
}

export async function getAPAging(params: {
    asOf: string;
}): Promise<APAgingReport[]> {
    // 1. Get all posted bills that are not fully paid
    const rows = await query<RowDataPacket[]>(
        `SELECT 
            pb.id, pb.bill_no, pb.bill_date, pb.due_date, pb.grand_total, pb.balance_due,
            s.id as supplier_id, s.supplier_code, s.name as supplier_name,
            DATEDIFF(?, pb.due_date) as days_overdue
         FROM purchase_bills pb
         JOIN suppliers s ON s.id = pb.supplier_id
         WHERE pb.status IN ('POSTED', 'PARTIALLY_PAID')
           AND pb.balance_due > 0
           AND pb.bill_date <= ?
         ORDER BY s.name, pb.due_date`,
        [params.asOf, params.asOf]
    );

    const reportMap = new Map<number, APAgingReport>();

    for (const row of rows) {
        const supplierId = row.supplier_id;
        if (!reportMap.has(supplierId)) {
            reportMap.set(supplierId, {
                supplierId,
                supplierCode: row.supplier_code,
                supplierName: row.supplier_name,
                aging: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 },
                bills: []
            });
        }

        const report = reportMap.get(supplierId)!;
        const balanceDue = Number(row.balance_due);
        const daysOverdue = Number(row.days_overdue);

        report.bills.push({
            billNo: row.bill_no,
            billDate: row.bill_date,
            dueDate: row.due_date,
            grandTotal: Number(row.grand_total),
            balanceDue,
            daysPastDue: daysOverdue > 0 ? daysOverdue : 0
        });

        report.aging.total += balanceDue;

        if (daysOverdue <= 0) {
            report.aging.current += balanceDue;
        } else if (daysOverdue <= 30) {
            report.aging.days1_30 += balanceDue;
        } else if (daysOverdue <= 60) {
            report.aging.days31_60 += balanceDue;
        } else if (daysOverdue <= 90) {
            report.aging.days61_90 += balanceDue;
        } else {
            report.aging.over90 += balanceDue;
        }
    }

    return Array.from(reportMap.values());
}

export async function getInventoryValuation(params: {
    asOf: string;
}): Promise<InventoryValuationReport> {
    // Calculate inventory value based on stock ledger as of date
    // Or simplified: current stock if asOf is today (assuming moving average cost)
    // For rigorous historical valuation, we'd need to replay the ledger.
    // For now, we will use a "Current Status" approximation if date is recent, 
    // or we can query the ledger. Querying ledger is safer.

    const rows = await query<RowDataPacket[]>(
        `SELECT 
            i.id, i.sku, i.name,
            (
                SELECT balance_value 
                FROM stock_ledger sl 
                WHERE sl.item_id = i.id AND sl.occurred_at <= ? 
                ORDER BY sl.occurred_at DESC, sl.id DESC 
                LIMIT 1
            ) as total_value,
            (
                SELECT balance_qty 
                FROM stock_ledger sl 
                WHERE sl.item_id = i.id AND sl.occurred_at <= ? 
                ORDER BY sl.occurred_at DESC, sl.id DESC 
                LIMIT 1
            ) as on_hand
         FROM items i
         WHERE i.track_inventory = 1 AND i.is_active = 1
         ORDER BY i.name`,
        [params.asOf, params.asOf] // Parameters need to be valid datetime strings, e.g. '2023-10-27 23:59:59'
    );

    const report: InventoryValuationReport = {
        asOf: params.asOf,
        totalValue: 0,
        items: []
    };

    for (const row of rows) {
        const totalValue = Number(row.total_value || 0);
        const onHand = Number(row.on_hand || 0);

        if (onHand !== 0 || totalValue !== 0) {
            report.items.push({
                itemId: row.id,
                sku: row.sku,
                name: row.name,
                onHand,
                totalValue,
                avgCost: onHand !== 0 ? totalValue / onHand : 0
            });
            report.totalValue += totalValue;
        }
    }

    return report;
}
