// =============================================================================
// SAL Accounting System - Chart of Accounts Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx } from '../db';
import type { ChartOfAccount } from '../../shared/types';

interface CoaRow extends RowDataPacket {
    id: number;
    account_code: string;
    account_name: string;
    account_type_code: string;
    parent_id: number | null;
    is_header: number;
    is_active: number;
    is_system: number;
    description: string | null;
}

/**
 * Get all chart of accounts
 */
export async function getChartOfAccounts(params: {
    search?: string;
    typeCode?: string;
    activeOnly?: boolean;
    flat?: boolean;
}): Promise<ChartOfAccount[]> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.search) {
        conditions.push('(account_code LIKE ? OR account_name LIKE ?)');
        const search = `%${params.search}%`;
        values.push(search, search);
    }

    if (params.typeCode) {
        conditions.push('account_type_code = ?');
        values.push(params.typeCode);
    }

    if (params.activeOnly !== false) {
        conditions.push('is_active = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query<CoaRow[]>(
        `SELECT * FROM chart_of_accounts ${whereClause} ORDER BY account_code`,
        values
    );

    const accounts: ChartOfAccount[] = rows.map(r => ({
        id: r.id,
        accountCode: r.account_code,
        accountName: r.account_name,
        accountTypeCode: r.account_type_code,
        parentId: r.parent_id || undefined,
        isHeader: Boolean(r.is_header),
        isActive: Boolean(r.is_active),
        isSystem: Boolean(r.is_system),
        description: r.description || undefined,
    }));

    if (params.flat) {
        return accounts;
    }

    // Build tree structure
    return buildAccountTree(accounts);
}

function buildAccountTree(accounts: ChartOfAccount[]): ChartOfAccount[] {
    const accountMap = new Map<number, ChartOfAccount>();
    const roots: ChartOfAccount[] = [];

    // First pass: create map
    for (const account of accounts) {
        accountMap.set(account.id, { ...account, children: [] });
    }

    // Second pass: build tree
    for (const account of accounts) {
        const node = accountMap.get(account.id)!;
        if (account.parentId && accountMap.has(account.parentId)) {
            const parent = accountMap.get(account.parentId)!;
            if (!parent.children) parent.children = [];
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

/**
 * Get account by ID
 */
export async function getAccountById(id: number): Promise<ChartOfAccount | null> {
    const rows = await query<CoaRow[]>(
        'SELECT * FROM chart_of_accounts WHERE id = ?',
        [id]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
        id: r.id,
        accountCode: r.account_code,
        accountName: r.account_name,
        accountTypeCode: r.account_type_code,
        parentId: r.parent_id || undefined,
        isHeader: Boolean(r.is_header),
        isActive: Boolean(r.is_active),
        isSystem: Boolean(r.is_system),
        description: r.description || undefined,
    };
}

/**
 * Create new account
 */
export async function createAccount(input: {
    accountCode: string;
    accountName: string;
    accountTypeCode: string;
    parentId?: number;
    isHeader?: boolean;
    description?: string;
}): Promise<number> {
    return transaction(async (connection) => {
        // Check for duplicate code
        const existing = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT id FROM chart_of_accounts WHERE account_code = ?',
            [input.accountCode]
        );

        if (existing.length > 0) {
            throw new Error(`Account code ${input.accountCode} already exists`);
        }

        const result = await executeTx(
            connection,
            `INSERT INTO chart_of_accounts 
             (account_code, account_name, account_type_code, parent_id, is_header, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                input.accountCode,
                input.accountName,
                input.accountTypeCode,
                input.parentId || null,
                input.isHeader ? 1 : 0,
                input.description || null,
            ]
        );

        return result.insertId;
    });
}

/**
 * Update account
 */
export async function updateAccount(
    id: number,
    input: {
        accountName?: string;
        description?: string;
        isActive?: boolean;
    }
): Promise<void> {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (input.accountName !== undefined) {
        updates.push('account_name = ?');
        values.push(input.accountName);
    }

    if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
    }

    if (input.isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(input.isActive ? 1 : 0);
    }

    if (updates.length === 0) return;

    values.push(id);
    await query(
        `UPDATE chart_of_accounts SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
}

/**
 * Get account types
 */
export async function getAccountTypes(): Promise<{ code: string; name: string; isDebit: boolean }[]> {
    const rows = await query<RowDataPacket[]>(
        'SELECT code, name, is_debit FROM account_types ORDER BY code'
    );

    return rows.map(r => ({
        code: r.code,
        name: r.name,
        isDebit: Boolean(r.is_debit),
    }));
}

/**
 * Get account balance
 */
export async function getAccountBalance(
    accountId: number,
    year: number,
    month: number
): Promise<{ debit: number; credit: number; balance: number }> {
    const rows = await query<RowDataPacket[]>(
        `SELECT debit_total, credit_total, closing_balance 
         FROM account_balances 
         WHERE account_id = ? AND period_year = ? AND period_month = ?`,
        [accountId, year, month]
    );

    if (rows.length === 0) {
        return { debit: 0, credit: 0, balance: 0 };
    }

    return {
        debit: Number(rows[0].debit_total),
        credit: Number(rows[0].credit_total),
        balance: Number(rows[0].closing_balance),
    };
}
