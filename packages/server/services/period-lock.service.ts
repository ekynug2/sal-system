// =============================================================================
// SAL Accounting System - Period Lock Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, execute } from '../db';
import { ErrorCodes } from '../../shared/constants';

interface PeriodLockRow extends RowDataPacket {
    id: number;
    period_start: string;
    period_end: string;
    locked_at: string;
    locked_by: number;
    memo: string | null;
}

export class PeriodLockError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 409
    ) {
        super(message);
        this.name = 'PeriodLockError';
    }
}

/**
 * Check if a date is within a locked period
 */
export async function isDateLocked(date: string): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM period_locks 
     WHERE ? BETWEEN period_start AND period_end`,
        [date]
    );
    return (rows[0]?.count || 0) > 0;
}

/**
 * Validate that a date is not in a locked period
 * Throws PeriodLockError if date is locked
 */
export async function validateDateNotLocked(date: string, context: string = 'Transaction'): Promise<void> {
    const locked = await isDateLocked(date);
    if (locked) {
        throw new PeriodLockError(
            ErrorCodes.PERIOD_LOCKED,
            `${context} date ${date} is within a locked period`
        );
    }
}

/**
 * Get all period locks
 */
export async function getPeriodLocks(): Promise<PeriodLockRow[]> {
    return query<PeriodLockRow[]>(
        `SELECT pl.*, u.full_name as locked_by_name
     FROM period_locks pl
     LEFT JOIN users u ON u.id = pl.locked_by
     ORDER BY period_start DESC`
    );
}

/**
 * Create a period lock
 */
export async function createPeriodLock(
    periodStart: string,
    periodEnd: string,
    userId: number,
    memo?: string
): Promise<number> {
    // Check for overlapping locks
    const overlapping = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM period_locks 
     WHERE (period_start <= ? AND period_end >= ?)
        OR (period_start <= ? AND period_end >= ?)
        OR (period_start >= ? AND period_end <= ?)`,
        [periodEnd, periodStart, periodStart, periodStart, periodStart, periodEnd]
    );

    if ((overlapping[0]?.count || 0) > 0) {
        throw new PeriodLockError(
            ErrorCodes.CONFLICT,
            'An overlapping period lock already exists'
        );
    }

    const result = await execute(
        `INSERT INTO period_locks (period_start, period_end, locked_by, memo)
     VALUES (?, ?, ?, ?)`,
        [periodStart, periodEnd, userId, memo || null]
    );

    return result.insertId;
}

/**
 * Remove a period lock
 */
export async function removePeriodLock(id: number): Promise<boolean> {
    const result = await execute(
        'DELETE FROM period_locks WHERE id = ?',
        [id]
    );
    return result.affectedRows > 0;
}
