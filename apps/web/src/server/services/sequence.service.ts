// =============================================================================
// SAL Accounting System - Number Sequence Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { queryTx, executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { SettingsKeys } from '@/shared/constants';

// Map SequenceKeys to SettingsKeys for custom formatting
const SequenceToSettingMap: Record<string, string> = {
    'SALES_INVOICE': SettingsKeys.FORMAT_SALES_INVOICE,
    'SALES_PAYMENT': SettingsKeys.FORMAT_SALES_PAYMENT,
    'CREDIT_NOTE': SettingsKeys.FORMAT_SALES_CREDIT_NOTE,
    'PURCHASE_RECEIPT': SettingsKeys.FORMAT_PURCHASE_RECEIPT,
    'PURCHASE_BILL': SettingsKeys.FORMAT_PURCHASE_BILL,
    'PURCHASE_PAYMENT': SettingsKeys.FORMAT_PURCHASE_PAYMENT,
    'ADJUSTMENT': SettingsKeys.FORMAT_INVENTORY_ADJUSTMENT,
    'OPNAME': SettingsKeys.FORMAT_INVENTORY_OPNAME,
    'JOURNAL': SettingsKeys.FORMAT_JOURNAL_ENTRY,
};

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

    // Check if reset is needed (only for YEARLY or MONTHLY)
    if (seq.reset_period === 'YEARLY' || seq.reset_period === 'MONTHLY') {
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
        // No reset period (NEVER or NULL), just increment
        await executeTx(
            connection,
            'UPDATE number_sequences SET next_number = next_number + 1 WHERE id = ?',
            [seq.id]
        );
    }

    const paddedNumber = String(nextNumber).padStart(seq.number_length, '0');
    const now = new Date();

    // Check for custom format in settings
    const settingKey = SequenceToSettingMap[sequenceKey];
    if (settingKey) {
        const settingRows = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT setting_value FROM settings WHERE setting_key = ?',
            [settingKey]
        );

        if (settingRows.length > 0 && settingRows[0].setting_value) {
            const formatString = settingRows[0].setting_value;
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(year).slice(-2);

            return formatString
                .replace('{YEAR}', String(year))
                .replace('{YY}', yy)
                .replace('{MONTH}', month)
                .replace('{MM}', month)
                .replace('{SEQ}', paddedNumber);
        }
    }

    // Default Legacy Formatting
    let prefix = seq.prefix;
    if (seq.reset_period === 'YEARLY') {
        prefix += String(now.getFullYear()).slice(-2);
    } else if (seq.reset_period === 'MONTHLY') {
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
