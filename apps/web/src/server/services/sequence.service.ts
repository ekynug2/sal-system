// =============================================================================
// SAL Accounting System - Number Sequence Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { queryTx, executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';

interface SequenceRow extends RowDataPacket {
    id: number;
    sequence_key: string;
    prefix: string;
    suffix: string;
    next_number: number;
    number_length: number;
    reset_period: string | null;
    last_reset_date: string | null;
}

/**
 * Generate next number for a sequence (within transaction)
 */
export async function getNextNumber(
    connection: PoolConnection,
    sequenceKey: string
): Promise<string> {
    // Lock and get current sequence
    const rows = await queryTx<SequenceRow[]>(
        connection,
        'SELECT * FROM number_sequences WHERE sequence_key = ? FOR UPDATE',
        [sequenceKey]
    );

    if (rows.length === 0) {
        throw new Error(`Sequence not found: ${sequenceKey}`);
    }

    const seq = rows[0];
    let nextNumber = seq.next_number;

    // Check if reset is needed
    if (seq.reset_period) {
        const now = new Date();
        const lastReset = seq.last_reset_date ? new Date(seq.last_reset_date) : null;

        let shouldReset = false;
        if (!lastReset) {
            shouldReset = true;
        } else if (seq.reset_period === 'YEARLY' && now.getFullYear() !== lastReset.getFullYear()) {
            shouldReset = true;
        } else if (seq.reset_period === 'MONTHLY') {
            if (
                now.getFullYear() !== lastReset.getFullYear() ||
                now.getMonth() !== lastReset.getMonth()
            ) {
                shouldReset = true;
            }
        }

        if (shouldReset) {
            nextNumber = 1;
            await executeTx(
                connection,
                'UPDATE number_sequences SET next_number = ?, last_reset_date = CURDATE() WHERE id = ?',
                [nextNumber + 1, seq.id]
            );
        } else {
            await executeTx(
                connection,
                'UPDATE number_sequences SET next_number = next_number + 1 WHERE id = ?',
                [seq.id]
            );
        }
    } else {
        // No reset, just increment
        await executeTx(
            connection,
            'UPDATE number_sequences SET next_number = next_number + 1 WHERE id = ?',
            [seq.id]
        );
    }

    // Format the number
    const paddedNumber = String(nextNumber).padStart(seq.number_length, '0');

    // Add year/month prefix if reset period is set
    let prefix = seq.prefix;
    if (seq.reset_period === 'YEARLY') {
        prefix += String(new Date().getFullYear()).slice(-2);
    } else if (seq.reset_period === 'MONTHLY') {
        const now = new Date();
        prefix += String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
    }

    return `${prefix}${paddedNumber}${seq.suffix}`;
}

// Sequence keys
export const SequenceKeys = {
    SALES_INVOICE: 'SALES_INVOICE',
    SALES_PAYMENT: 'SALES_PAYMENT',
    CREDIT_NOTE: 'CREDIT_NOTE',
    PURCHASE_RECEIPT: 'PURCHASE_RECEIPT',
    PURCHASE_BILL: 'PURCHASE_BILL',
    PURCHASE_PAYMENT: 'PURCHASE_PAYMENT',
    DEBIT_NOTE: 'DEBIT_NOTE',
    ADJUSTMENT: 'ADJUSTMENT',
    OPNAME: 'OPNAME',
    JOURNAL: 'JOURNAL',
    CUSTOMER: 'CUSTOMER',
    SUPPLIER: 'SUPPLIER',
    ITEM: 'ITEM',
} as const;
