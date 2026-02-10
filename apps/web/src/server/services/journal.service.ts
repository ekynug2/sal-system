// =============================================================================
// SAL Accounting System - Journal Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, queryTx, executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { getNextNumber, SequenceKeys } from './sequence.service';
import type { JournalEntry, JournalLine } from '../../shared/types';

interface JournalEntryRow extends RowDataPacket {
    id: number;
    entry_no: string;
    entry_date: string;
    source_type: string;
    source_id: number | null;
    is_manual: number;
    is_reversal: number;
    memo: string | null;
    total_debit: number;
    total_credit: number;
    posted_at: string;
    posted_by: number;
}

interface JournalLineRow extends RowDataPacket {
    id: number;
    journal_entry_id: number;
    line_no: number;
    account_id: number;
    account_code: string;
    account_name: string;
    dc: 'D' | 'C';
    amount: number;
    memo: string | null;
    entity_type: string | null;
    entity_id: number | null;
}

export interface JournalLineInput {
    accountId: number;
    dc: 'D' | 'C';
    amount: number;
    memo?: string;
    entityType?: string;
    entityId?: number;
}

export interface CreateJournalInput {
    entryDate: string;
    sourceType: string;
    sourceId?: number;
    isManual?: boolean;
    memo?: string;
    lines: JournalLineInput[];
    postedBy: number;
}

// -----------------------------------------------------------------------------
// Journal Entry Operations
// -----------------------------------------------------------------------------

/**
 * Create a journal entry (within transaction)
 */
export async function createJournalEntry(
    connection: PoolConnection,
    input: CreateJournalInput
): Promise<number> {
    // Validate debits = credits
    const totalDebit = input.lines
        .filter(l => l.dc === 'D')
        .reduce((sum, l) => sum + l.amount, 0);

    const totalCredit = input.lines
        .filter(l => l.dc === 'C')
        .reduce((sum, l) => sum + l.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Journal entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    // Generate entry number
    const entryNo = await getNextNumber(connection, SequenceKeys.JOURNAL);

    // Insert journal entry
    const result = await executeTx(
        connection,
        `INSERT INTO journal_entries 
     (entry_no, entry_date, source_type, source_id, is_manual, memo, total_debit, total_credit, posted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            entryNo,
            input.entryDate,
            input.sourceType,
            input.sourceId || null,
            input.isManual ? 1 : 0,
            input.memo || null,
            totalDebit,
            totalCredit,
            input.postedBy,
        ]
    );

    const journalEntryId = result.insertId;

    // Insert journal lines (Bulk)
    if (input.lines.length > 0) {
        const lineValues: (string | number | null)[] = [];
        const placeholders = input.lines.map((line, i) => {
            lineValues.push(
                journalEntryId,
                i + 1,
                line.accountId,
                line.dc,
                line.amount,
                line.memo || null,
                line.entityType || null,
                line.entityId || null
            );
            return '(?, ?, ?, ?, ?, ?, ?, ?)';
        }).join(', ');

        await executeTx(
            connection,
            `INSERT INTO journal_lines 
       (journal_entry_id, line_no, account_id, dc, amount, memo, entity_type, entity_id)
       VALUES ${placeholders}`,
            lineValues
        );
    }

    // Update account balances (simplified - in production, use more sophisticated approach)
    for (const line of input.lines) {
        await updateAccountBalance(connection, line.accountId, input.entryDate, line.dc, line.amount);
    }

    return journalEntryId;
}

/**
 * Update account balance for period
 */
async function updateAccountBalance(
    connection: PoolConnection,
    accountId: number,
    entryDate: string,
    dc: 'D' | 'C',
    amount: number
): Promise<void> {
    const date = new Date(entryDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Check if balance record exists
    const existing = await queryTx<RowDataPacket[]>(
        connection,
        `SELECT id FROM account_balances WHERE account_id = ? AND period_year = ? AND period_month = ?`,
        [accountId, year, month]
    );

    if (existing.length === 0) {
        // Create new balance record
        await executeTx(
            connection,
            `INSERT INTO account_balances (account_id, period_year, period_month, debit_total, credit_total, closing_balance)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                accountId,
                year,
                month,
                dc === 'D' ? amount : 0,
                dc === 'C' ? amount : 0,
                dc === 'D' ? amount : -amount,
            ]
        );
    } else {
        // Update existing record
        const debitAdd = dc === 'D' ? amount : 0;
        const creditAdd = dc === 'C' ? amount : 0;
        const balanceChange = dc === 'D' ? amount : -amount;

        await executeTx(
            connection,
            `UPDATE account_balances 
       SET debit_total = debit_total + ?, credit_total = credit_total + ?, closing_balance = closing_balance + ?
       WHERE account_id = ? AND period_year = ? AND period_month = ?`,
            [debitAdd, creditAdd, balanceChange, accountId, year, month]
        );
    }
}

/**
 * Get journal entries
 */
export async function getJournalEntries(params: {
    from?: string;
    to?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
}): Promise<{ entries: JournalEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.from) {
        conditions.push('je.entry_date >= ?');
        values.push(params.from);
    }

    if (params.to) {
        conditions.push('je.entry_date <= ?');
        values.push(params.to);
    }

    if (params.sourceType) {
        conditions.push('je.source_type = ?');
        values.push(params.sourceType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM journal_entries je ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get entries
    const rows = await query<JournalEntryRow[]>(
        `SELECT je.*
     FROM journal_entries je
     ${whereClause}
     ORDER BY je.entry_date DESC, je.id DESC
     LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    // Get lines for all entries (Bulk)
    if (rows.length > 0) {
        const entryIds = rows.map(r => r.id);
        const lineRows = await query<JournalLineRow[]>(
            `SELECT jl.*, coa.account_code, coa.account_name
             FROM journal_lines jl
             INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
             WHERE jl.journal_entry_id IN (${entryIds.map(() => '?').join(',')})
             ORDER BY jl.journal_entry_id, jl.line_no`,
            entryIds
        );

        // Group lines by entryId
        const linesMap = new Map<number, JournalLine[]>();
        for (const r of lineRows) {
            const entryId = r.journal_entry_id;
            if (!linesMap.has(entryId)) linesMap.set(entryId, []);

            linesMap.get(entryId)!.push({
                lineNo: r.line_no,
                accountId: r.account_id,
                accountCode: r.account_code,
                accountName: r.account_name,
                dc: r.dc,
                amount: Number(r.amount),
                memo: r.memo || undefined,
                entityType: r.entity_type || undefined,
                entityId: r.entity_id || undefined,
            });
        }

        const entries: JournalEntry[] = rows.map(row => ({
            id: row.id,
            entryNo: row.entry_no,
            entryDate: row.entry_date,
            sourceType: row.source_type,
            sourceId: row.source_id || undefined,
            isManual: Boolean(row.is_manual),
            isReversal: Boolean(row.is_reversal),
            memo: row.memo || undefined,
            totalDebit: Number(row.total_debit),
            totalCredit: Number(row.total_credit),
            postedAt: row.posted_at,
            postedBy: row.posted_by,
            lines: linesMap.get(row.id) || [],
        }));

        return { entries, total };
    }

    return { entries: [], total };
}



/**
 * Get default account ID by mapping key
 */
export async function getDefaultAccountId(
    connection: PoolConnection,
    mappingKey: string
): Promise<number> {
    const rows = await queryTx<RowDataPacket[]>(
        connection,
        'SELECT account_id FROM default_account_mappings WHERE mapping_key = ?',
        [mappingKey]
    );

    if (rows.length === 0) {
        throw new Error(`Default account mapping not found: ${mappingKey}`);
    }

    return rows[0].account_id;
}

/**
 * Get tax accounts for a tax code
 */
export async function getTaxAccounts(
    connection: PoolConnection,
    taxCode: string
): Promise<{ outputAccountId: number | null; inputAccountId: number | null; rate: number }> {
    const rows = await queryTx<RowDataPacket[]>(
        connection,
        'SELECT tax_account_id, tax_input_account_id, rate FROM tax_codes WHERE code = ?',
        [taxCode]
    );

    if (rows.length === 0) {
        return { outputAccountId: null, inputAccountId: null, rate: 0 };
    }

    return {
        outputAccountId: rows[0].tax_account_id,
        inputAccountId: rows[0].tax_input_account_id,
        rate: Number(rows[0].rate),
    };
}
