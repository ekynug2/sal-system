// =============================================================================
// SAL Accounting System - Purchase Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { ErrorCodes, DocumentStatus, SourceType, DefaultAccountKeys } from '../../shared/constants';
import { getNextNumber, SequenceKeys } from './sequence.service';
import { createAuditLogTx } from './audit.service';
import { updateStock, getItemStock } from './inventory.service';
import { createJournalEntry, getDefaultAccountId, getTaxAccounts } from './journal.service';
import type { PurchaseBill, PurchaseBillLine } from '../../shared/types';

interface PurchaseBillRow extends RowDataPacket {
    id: number;
    bill_no: string;
    supplier_id: number;
    supplier_inv_no: string | null;
    bill_date: Date;
    due_date: Date;
    status: string;
    subtotal: number;
    tax_total: number;
    grand_total: number;
    paid_amount: number;
    balance_due: number;
    memo: string | null;
}

export interface CreatePurchaseBillInput {
    supplierId: number;
    supplierInvoiceNo?: string;
    billDate: string;
    dueDate: string;
    memo?: string;
    lines: {
        itemId: number;
        description?: string;
        qty: number;
        unitCost: number;
        taxCode: string; // 'PPN' or 'NON'
        memo?: string;
    }[];
}

export class PurchaseError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'PurchaseError';
    }
}

// -----------------------------------------------------------------------------
// Read Operations
// -----------------------------------------------------------------------------

export async function getPurchaseBills(params: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
}): Promise<{ bills: PurchaseBill[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.status) {
        conditions.push('pb.status = ?');
        values.push(params.status);
    }

    if (params.supplierId) {
        conditions.push('pb.supplier_id = ?');
        values.push(params.supplierId);
    }

    if (params.startDate) {
        conditions.push('pb.bill_date >= ?');
        values.push(params.startDate);
    }

    if (params.endDate) {
        conditions.push('pb.bill_date <= ?');
        values.push(params.endDate);
    }

    if (params.search) {
        conditions.push('(pb.bill_no LIKE ? OR s.name LIKE ? OR pb.supplier_inv_no LIKE ?)');
        const term = `%${params.search}%`;
        values.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total 
         FROM purchase_bills pb
         INNER JOIN suppliers s ON s.id = pb.supplier_id
         ${whereClause}`,
        values
    );
    const total = countResult[0]?.total || 0;

    const rows = await query<PurchaseBillRow[] & { supplier_name: string }[]>(
        `SELECT pb.*, s.name as supplier_name
         FROM purchase_bills pb
         INNER JOIN suppliers s ON s.id = pb.supplier_id
         ${whereClause}
         ORDER BY pb.bill_date DESC, pb.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const bills: PurchaseBill[] = rows.map(r => ({
        id: r.id,
        billNo: r.bill_no,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        billDate: r.bill_date.toISOString(),
        dueDate: r.due_date.toISOString(),
        status: r.status as any,
        supplierInvoiceNo: r.supplier_inv_no || undefined,
        subtotal: Number(r.subtotal),
        taxTotal: Number(r.tax_total),
        grandTotal: Number(r.grand_total),
        paidAmount: Number(r.paid_amount),
        balanceDue: Number(r.balance_due),
        memo: r.memo || undefined,
        lines: [], // Not fetching lines for list view
    }));

    return { bills, total };
}

export async function getPurchaseBill(id: number): Promise<PurchaseBill | null> {
    const rows = await query<PurchaseBillRow[] & { supplier_name: string }[]>(
        `SELECT pb.*, s.name as supplier_name
         FROM purchase_bills pb
         INNER JOIN suppliers s ON s.id = pb.supplier_id
         WHERE pb.id = ?`,
        [id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Get Lines
    const lineRows = await query<any[]>(
        `SELECT pbl.*, i.sku, i.name as item_name
         FROM purchase_bill_lines pbl
         LEFT JOIN items i ON i.id = pbl.item_id
         WHERE pbl.bill_id = ?
         ORDER BY pbl.line_no`,
        [id]
    );

    const lines: PurchaseBillLine[] = lineRows.map(l => ({
        lineNo: l.line_no,
        itemId: l.item_id,
        itemSku: l.sku,
        itemName: l.item_name,
        description: l.description || undefined,
        qty: Number(l.qty),
        unitCost: Number(l.unit_cost),
        taxCode: l.tax_code,
        taxRate: Number(l.tax_rate),
        lineSubtotal: Number(l.line_subtotal),
        lineTax: Number(l.line_tax),
        lineTotal: Number(l.line_total),
        memo: l.memo || undefined,
    }));

    return {
        id: r.id,
        billNo: r.bill_no,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        billDate: r.bill_date.toISOString(),
        dueDate: r.due_date.toISOString(),
        status: r.status as any,
        supplierInvoiceNo: r.supplier_inv_no || undefined,
        subtotal: Number(r.subtotal),
        taxTotal: Number(r.tax_total),
        grandTotal: Number(r.grand_total),
        paidAmount: Number(r.paid_amount),
        balanceDue: Number(r.balance_due),
        memo: r.memo || undefined,
        lines,
    };
}

// -----------------------------------------------------------------------------
// Write Operations
// -----------------------------------------------------------------------------

export async function createPurchaseBill(
    input: CreatePurchaseBillInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // 1. Calculate totals
        let subtotal = 0;
        let taxTotal = 0;

        const linesWithCalc = [];

        for (const line of input.lines) {
            const lineSubtotal = line.qty * line.unitCost;

            // Get tax rate
            const { rate: taxRate } = await getTaxAccounts(connection, line.taxCode);

            const lineTax = (lineSubtotal * taxRate) / 100;
            const lineTotal = lineSubtotal + lineTax;

            subtotal += lineSubtotal;
            taxTotal += lineTax;

            linesWithCalc.push({
                ...line,
                taxRate,
                lineSubtotal,
                lineTax,
                lineTotal,
            });
        }

        const grandTotal = subtotal + taxTotal;

        // 2. Generate Number
        const billNo = await getNextNumber(connection, SequenceKeys.PURCHASE_BILL);

        // 3. Insert Header
        const result = await executeTx(
            connection,
            `INSERT INTO purchase_bills 
             (bill_no, supplier_id, supplier_inv_no, bill_date, due_date, status, 
              subtotal, tax_total, grand_total, paid_amount, balance_due, memo, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
            [
                billNo,
                input.supplierId,
                input.supplierInvoiceNo || null,
                input.billDate,
                input.dueDate,
                subtotal,
                taxTotal,
                grandTotal,
                grandTotal, // Balance Due starts as full amount
                input.memo || null,
                userId,
            ]
        );
        const billId = result.insertId;

        // 4. Insert Lines
        let lineNo = 1;
        for (const line of linesWithCalc) {
            await executeTx(
                connection,
                `INSERT INTO purchase_bill_lines
                 (bill_id, line_no, item_id, description, qty, unit_cost, 
                  tax_code, tax_rate, line_subtotal, line_tax, line_total, memo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    billId,
                    lineNo++,
                    line.itemId,
                    line.description || null,
                    line.qty,
                    line.unitCost,
                    line.taxCode,
                    line.taxRate,
                    line.lineSubtotal,
                    line.lineTax,
                    line.lineTotal,
                    line.memo || null,
                ]
            );
        }

        // 5. Audit Log
        await createAuditLogTx(connection, {
            action: 'CREATE',
            entityType: 'PURCHASE_BILL',
            entityId: billId,
            actorUserId: userId,
            metadata: { billNo, supplierId: input.supplierId, grandTotal },
        });

        return billId;
    });
}

export async function postPurchaseBill(id: number, userId: number): Promise<void> {
    return transaction(async (connection) => {
        // 1. Get Bill
        const bills = await queryTx<PurchaseBillRow[]>(
            connection,
            'SELECT * FROM purchase_bills WHERE id = ? FOR UPDATE',
            [id]
        );
        if (bills.length === 0) throw new PurchaseError(ErrorCodes.RESOURCE_NOT_FOUND, 'Bill not found');
        const bill = bills[0];

        if (bill.status !== DocumentStatus.DRAFT) {
            throw new PurchaseError(ErrorCodes.PRC_BILL_ALREADY_POSTED, `Bill status is ${bill.status}`);
        }

        const lines = await queryTx<any[]>(
            connection,
            'SELECT * FROM purchase_bill_lines WHERE bill_id = ? ORDER BY line_no',
            [id]
        );

        // 2. Process Inventory & Accounting
        let totalAssetValue = 0;
        let totalTaxValue = 0;

        for (const line of lines) {
            const qty = Number(line.qty);
            const unitCost = Number(line.unit_cost); // Exclude tax for inventory valuation

            // A. Update Inventory Stock (Receive Goods)
            // Use InventoryService.updateStock
            await updateStock(connection, {
                itemId: line.item_id,
                qtyDelta: qty,
                unitCost: unitCost,
                sourceType: SourceType.PURCHASE_BILL,
                sourceId: id,
                sourceLineId: line.id,
                memo: `PB: ${bill.bill_no}`,
            });

            // B. Accumulate for Journal
            const lineSubtotal = Number(line.line_subtotal);
            const lineTax = Number(line.line_tax);

            totalAssetValue += lineSubtotal;
            totalTaxValue += lineTax;
        }

        // 3. Create Journal Entry
        //    Debit: Inventory Asset (Total Subtotal) - Can split by category if needed, but simple for now
        //    Debit: VAT Input (Total Tax)
        //    Credit: AP Trade (Grand Total)

        const journalLines = [];

        // Debit Inventory
        const inventoryAccId = await getDefaultAccountId(connection, DefaultAccountKeys.INVENTORY_ASSET);
        if (totalAssetValue > 0) {
            journalLines.push({
                accountId: inventoryAccId,
                dc: 'D' as const,
                amount: totalAssetValue,
                memo: `Inventory from PB ${bill.bill_no}`,
            });
        }

        // Debit VAT Input
        const vatInAccId = await getDefaultAccountId(connection, DefaultAccountKeys.PPN_INPUT);
        if (totalTaxValue > 0) {
            journalLines.push({
                accountId: vatInAccId,
                dc: 'D' as const,
                amount: totalTaxValue,
                memo: `VAT In from PB ${bill.bill_no}`,
            });
        }

        // Credit Accounts Payable
        const apAccId = await getDefaultAccountId(connection, DefaultAccountKeys.AP_TRADE);
        const grandTotal = Number(bill.grand_total);
        if (grandTotal > 0) {
            journalLines.push({
                accountId: apAccId,
                dc: 'C' as const,
                amount: grandTotal,
                entityType: 'SUPPLIER',
                entityId: bill.supplier_id,
                memo: `AP for PB ${bill.bill_no}`,
            });
        }

        await createJournalEntry(connection, {
            entryDate: bill.bill_date.toISOString().split('T')[0], // YYYY-MM-DD
            sourceType: SourceType.PURCHASE_BILL,
            sourceId: id,
            memo: `Posted PB ${bill.bill_no}`,
            postedBy: userId,
            lines: journalLines,
        });

        // 4. Update Bill Status
        await executeTx(
            connection,
            `UPDATE purchase_bills 
             SET status = ?, posted_by = ?, posted_at = NOW(), updated_at = NOW() 
             WHERE id = ?`,
            [DocumentStatus.POSTED, userId, id]
        );

        // 5. Audit Log
        await createAuditLogTx(connection, {
            action: 'POST',
            entityType: 'PURCHASE_BILL',
            entityId: id,
            actorUserId: userId,
            metadata: { billNo: bill.bill_no, grandTotal: bill.grand_total },
        });
    });
}
