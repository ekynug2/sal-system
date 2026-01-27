// =============================================================================
// SAL Accounting System - Report Service
// =============================================================================

import { query } from '../db';
import { RowDataPacket } from 'mysql2';
import type { ProfitLossReport } from '../../shared/types';
import { AccountType } from '../../shared/constants';

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
