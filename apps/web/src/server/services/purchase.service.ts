// =============================================================================
// SAL Accounting System - Purchase Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx } from '../db';
import { ErrorCodes, DocumentStatus, SourceType, DefaultAccountKeys } from '../../shared/constants';
import { getNextNumber, SequenceKeys } from './sequence.service';
import { createAuditLogTx } from './audit.service';
import { updateStock } from './inventory.service';
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
        if (params.status === 'UNPAID') {
            conditions.push("pb.status IN ('POSTED', 'PARTIALLY_PAID')");
        } else {
            conditions.push('pb.status = ?');
            values.push(params.status);
        }
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
        status: r.status as DocumentStatus,
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
    const lineRows = await query<RowDataPacket[]>(
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
        status: r.status as DocumentStatus,
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
/**
 * Creates a purchase bill and its line items in the database, computing line subtotals, taxes, and grand total, generating a bill number, and recording an audit entry.
 *
 * @param input - Purchase bill data including supplier, invoice/due dates, optional memo, and an array of line items
 * @param userId - ID of the user performing the operation (used for created_by/updated_by and audit)
 * @returns The ID of the newly created purchase bill
 */

export async function createPurchaseBill(
    input: CreatePurchaseBillInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // 1. Calculate totals
        let subtotal = 0;
        let taxTotal = 0;

        const linesWithCalc = [];

        // 1. Calculate totals
        // Pre-fetch tax rates
        const taxCodes = [...new Set(input.lines.map(l => l.taxCode))];
        const taxRates = new Map<string, number>();

        if (taxCodes.length > 0) {
            const taxRows = await queryTx<RowDataPacket[]>(
                connection,
                `SELECT code, rate FROM tax_codes WHERE code IN (${taxCodes.map(() => '?').join(',')})`,
                taxCodes
            );
            for (const row of taxRows) {
                taxRates.set(row.code, Number(row.rate));
            }
        }

        for (const line of input.lines) {
            const lineSubtotal = line.qty * line.unitCost;

            // Get tax rate
            const taxRate = taxRates.get(line.taxCode) ?? 0;

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
        // 4. Insert Lines (Bulk)
        if (linesWithCalc.length > 0) {
            const lineValues: (string | number | null)[] = [];
            const placeholders = linesWithCalc.map(line => {
                lineValues.push(
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
                    line.memo || null
                );
                return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            }).join(', ');

            await executeTx(
                connection,
                `INSERT INTO purchase_bill_lines
                 (bill_id, line_no, item_id, description, qty, unit_cost, 
                  tax_code, tax_rate, line_subtotal, line_tax, line_total, memo)
                 VALUES ${placeholders}`,
                lineValues
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

        const lines = await queryTx<RowDataPacket[]>(
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

// -----------------------------------------------------------------------------
// Payment Operations
// -----------------------------------------------------------------------------

export interface PayBillInput {
    supplierId: number;
    paymentDate: string;
    method: string;
    amountTotal: number;
    allocations: { billId: number; amount: number }[];
    bankAccountId?: number;
    referenceNo?: string;
    memo?: string;
}

/**
 * Create a supplier payment, allocate amounts to one or more bills, post corresponding journal entries, update bill statuses, and return the created payment ID.
 *
 * @param input - Payment details including supplier, payment date, total amount, optional bank account, reference/memo, and allocations per bill
 * @param userId - ID of the user performing the payment
 * @returns The ID of the newly created payment record
 * @throws PurchaseError - If a referenced bill or bank account is not found, if an allocation exceeds a bill's remaining balance, if total allocations do not match the payment amount, or if a bill is not in a payable status
 */
export async function createPurchasePayment(
    input: PayBillInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // 1. Generate Payment Number
        const paymentNo = await getNextNumber(connection, SequenceKeys.PURCHASE_PAYMENT);

        // 2. Validate Allocations
        let totalAllocated = 0;
        for (const alloc of input.allocations) {
            const billRows = await queryTx<RowDataPacket[]>(
                connection,
                'SELECT * FROM purchase_bills WHERE id = ? AND supplier_id = ? FOR UPDATE',
                [alloc.billId, input.supplierId]
            );

            if (billRows.length === 0) {
                throw new PurchaseError(ErrorCodes.RESOURCE_NOT_FOUND, `Bill ${alloc.billId} not found`, 404);
            }

            const bill = billRows[0];
            if (!['POSTED', 'PARTIALLY_PAID'].includes(bill.status)) {
                throw new PurchaseError(ErrorCodes.CONFLICT, `Bill ${bill.bill_no} is not in posted status`, 409);
            }

            const balanceDue = Number(bill.grand_total) - Number(bill.paid_amount);
            // Allow small tolerance for floating point
            if (alloc.amount > balanceDue + 0.01) {
                throw new PurchaseError(
                    ErrorCodes.CONFLICT,
                    `Payment amount ${alloc.amount} exceeds bill balance ${balanceDue}`,
                    409
                );
            }

            totalAllocated += alloc.amount;
        }

        if (Math.abs(totalAllocated - input.amountTotal) > 0.01) {
            throw new PurchaseError(
                ErrorCodes.VALIDATION_ERROR,
                `Total allocations ${totalAllocated} does not match payment amount ${input.amountTotal}`,
                422
            );
        }

        // 3. Get Accounts
        const bankAccountId = input.bankAccountId;
        let bankCoaId: number;

        if (bankAccountId) {
            const bankRows = await queryTx<RowDataPacket[]>(
                connection,
                'SELECT coa_id FROM bank_accounts WHERE id = ?',
                [bankAccountId]
            );
            if (bankRows.length === 0) {
                throw new PurchaseError(ErrorCodes.RESOURCE_NOT_FOUND, 'Bank account not found', 404);
            }
            bankCoaId = bankRows[0].coa_id;
        } else {
            // Default to Cash
            bankCoaId = await getDefaultAccountId(connection, DefaultAccountKeys.CASH_ON_HAND);
        }

        const apAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.AP_TRADE);

        // 4. Insert Payment Helper
        const result = await executeTx(
            connection,
            `INSERT INTO purchase_payments 
             (payment_no, supplier_id, payment_date, method, bank_account_id, amount_total, 
              reference_no, memo, posted_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                paymentNo,
                input.supplierId,
                input.paymentDate,
                input.method,
                input.bankAccountId || null,
                input.amountTotal,
                input.referenceNo || null,
                input.memo || null,
                userId,
            ]
        );
        const paymentId = result.insertId;

        // 5. Create Allocations & Update Bills
        // 5. Create Allocations & Update Bills
        if (input.allocations.length > 0) {
            // Bulk Insert Allocations
            const allocValues: (string | number | null)[] = [];
            const placeholders = input.allocations.map(alloc => {
                allocValues.push(paymentId, alloc.billId, alloc.amount);
                return '(?, ?, ?)';
            });

            await executeTx(
                connection,
                `INSERT INTO purchase_payment_allocations (payment_id, bill_id, amount) VALUES ${placeholders.join(', ')}`,
                allocValues
            );

            // Update Bills (Sequential execution for status logic safety)
            for (const alloc of input.allocations) {
                await executeTx(
                    connection,
                    `UPDATE purchase_bills 
                     SET paid_amount = paid_amount + ?,
                         status = CASE 
                            WHEN paid_amount + ? >= grand_total - 0.01 THEN 'PAID'
                            ELSE 'PARTIALLY_PAID'
                         END,
                         updated_at = NOW()
                     WHERE id = ?`,
                    [alloc.amount, alloc.amount, alloc.billId]
                );
            }
        }

        // 6. Journal Entry
        //    Debit: AP Trade (decreases liability)
        //    Credit: Bank/Cash (decreases asset)

        // Get supplier name for memo
        const suppRows = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT name FROM suppliers WHERE id = ?',
            [input.supplierId]
        );
        const supplierName = suppRows[0]?.name || 'Unknown';

        await createJournalEntry(connection, {
            entryDate: input.paymentDate,
            sourceType: SourceType.PURCHASE_PAYMENT,
            sourceId: paymentId,
            memo: `Payment ${paymentNo} to ${supplierName}`,
            postedBy: userId,
            lines: [
                {
                    accountId: apAccountId,
                    dc: 'D',
                    amount: input.amountTotal,
                    entityType: 'SUPPLIER',
                    entityId: input.supplierId,
                    memo: `Payment to ${supplierName}`,
                },
                {
                    accountId: bankCoaId,
                    dc: 'C',
                    amount: input.amountTotal,
                    memo: `Paid bill(s) - ${paymentNo}`,
                }
            ]
        });

        // 7. Audit Log
        await createAuditLogTx(connection, {
            action: 'CREATE',
            entityType: 'PURCHASE_PAYMENT',
            entityId: paymentId,
            actorUserId: userId,
            metadata: { paymentNo, amount: input.amountTotal, supplierId: input.supplierId }
        });

        return paymentId;
    });
}

// -----------------------------------------------------------------------------
// Get Purchase Payments
// -----------------------------------------------------------------------------

interface PurchasePaymentRow extends RowDataPacket {
    id: number;
    payment_no: string;
    supplier_id: number;
    supplier_name: string;
    payment_date: string;
    method: string;
    bank_account_id: number | null;
    amount_total: number;
    reference_no: string | null;
    memo: string | null;
}

export async function getPurchasePayments(params: {
    supplierId?: number;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{ payments: import('../../shared/types').PurchasePayment[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.supplierId) {
        conditions.push('pp.supplier_id = ?');
        values.push(params.supplierId);
    }

    if (params.search) {
        conditions.push('(pp.payment_no LIKE ? OR s.name LIKE ? OR pp.reference_no LIKE ?)');
        const term = `%${params.search}%`;
        values.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM purchase_payments pp
         INNER JOIN suppliers s ON s.id = pp.supplier_id
         ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get payments
    const rows = await query<PurchasePaymentRow[]>(
        `SELECT pp.*, s.name as supplier_name
         FROM purchase_payments pp
         INNER JOIN suppliers s ON s.id = pp.supplier_id
         ${whereClause}
         ORDER BY pp.payment_date DESC, pp.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const payments = rows.map(r => ({
        id: r.id,
        paymentNo: r.payment_no,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        paymentDate: r.payment_date,
        method: r.method as import('../../shared/types').PaymentMethod,
        bankAccountId: r.bank_account_id || undefined,
        amountTotal: Number(r.amount_total),
        referenceNo: r.reference_no || undefined,
        memo: r.memo || undefined,
        allocations: [],
    }));

    return { payments, total };
}

// -----------------------------------------------------------------------------
// Purchase Receipts
// -----------------------------------------------------------------------------

interface PurchaseReceiptRow extends RowDataPacket {
    id: number;
    receipt_no: string;
    supplier_id: number;
    supplier_name: string;
    receipt_date: string;
    status: string;
    reference_no: string | null;
    memo: string | null;
}

export interface CreatePurchaseReceiptInput {
    supplierId: number;
    receiptDate: string;
    referenceNo?: string;
    memo?: string;
    lines: {
        itemId: number;
        qty: number;
        unitCost: number;
        taxCode: string;
        memo?: string;
    }[];
}

export async function getPurchaseReceipts(params: {
    supplierId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{ receipts: import('../../shared/types').PurchaseReceipt[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.supplierId) {
        conditions.push('pr.supplier_id = ?');
        values.push(params.supplierId);
    }

    if (params.status) {
        conditions.push('pr.status = ?');
        values.push(params.status);
    }

    if (params.search) {
        conditions.push('(pr.receipt_no LIKE ? OR s.name LIKE ? OR pr.reference_no LIKE ?)');
        const term = `%${params.search}%`;
        values.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM purchase_receipts pr
         INNER JOIN suppliers s ON s.id = pr.supplier_id
         ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get receipts
    const rows = await query<PurchaseReceiptRow[]>(
        `SELECT pr.*, s.name as supplier_name
         FROM purchase_receipts pr
         INNER JOIN suppliers s ON s.id = pr.supplier_id
         ${whereClause}
         ORDER BY pr.receipt_date DESC, pr.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const receipts = rows.map(r => ({
        id: r.id,
        receiptNo: r.receipt_no,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        receiptDate: r.receipt_date,
        status: r.status as import('../../shared/types').DocumentStatus,
        referenceNo: r.reference_no || undefined,
        memo: r.memo || undefined,
        lines: [],
    }));

    return { receipts, total };
}

export async function createPurchaseReceipt(
    input: CreatePurchaseReceiptInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // Generate receipt number
        const receiptNo = await getNextNumber(connection, SequenceKeys.PURCHASE_RECEIPT);

        // Get tax rates for lines
        const taxRates = new Map<string, number>();
        for (const line of input.lines) {
            if (!taxRates.has(line.taxCode)) {
                const taxInfo = await getTaxAccounts(connection, line.taxCode);
                taxRates.set(line.taxCode, taxInfo.rate);
            }
        }

        // Insert receipt header
        const result = await executeTx(
            connection,
            `INSERT INTO purchase_receipts 
             (receipt_no, supplier_id, receipt_date, status, reference_no, memo, created_by)
             VALUES (?, ?, ?, 'DRAFT', ?, ?, ?)`,
            [
                receiptNo,
                input.supplierId,
                input.receiptDate,
                input.referenceNo || null,
                input.memo || null,
                userId,
            ]
        );

        const receiptId = result.insertId;

        // Insert lines
        for (let i = 0; i < input.lines.length; i++) {
            const line = input.lines[i];
            const taxRate = taxRates.get(line.taxCode) || 0;
            const lineValue = line.qty * line.unitCost;
            const lineTax = lineValue * taxRate;

            await executeTx(
                connection,
                `INSERT INTO purchase_receipt_lines 
                 (receipt_id, line_no, item_id, qty, unit_cost, tax_code, tax_rate, line_value, line_tax, memo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    receiptId,
                    i + 1,
                    line.itemId,
                    line.qty,
                    line.unitCost,
                    line.taxCode,
                    taxRate,
                    lineValue,
                    lineTax,
                    line.memo || null,
                ]
            );
        }

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'CREATE',
            entityType: 'PURCHASE_RECEIPT',
            entityId: receiptId,
            afterData: { receiptNo, supplierId: input.supplierId },
        });

        return receiptId;
    });
}

export async function postPurchaseReceipt(
    receiptId: number,
    userId: number,
    idempotencyKey: string
): Promise<void> {
    return transaction(async (connection) => {
        // Check idempotency
        const existingKey = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT id FROM idempotency_keys WHERE key_value = ?',
            [idempotencyKey]
        );

        if (existingKey.length > 0) {
            return;
        }

        // Lock and get receipt
        const receiptRows = await queryTx<PurchaseReceiptRow[]>(
            connection,
            `SELECT pr.*, s.name as supplier_name
             FROM purchase_receipts pr
             INNER JOIN suppliers s ON s.id = pr.supplier_id
             WHERE pr.id = ? FOR UPDATE`,
            [receiptId]
        );

        if (receiptRows.length === 0) {
            throw new PurchaseError(ErrorCodes.RESOURCE_NOT_FOUND, 'Receipt not found', 404);
        }

        const receipt = receiptRows[0];

        if (receipt.status !== 'DRAFT') {
            throw new PurchaseError(ErrorCodes.PRC_RECEIPT_ALREADY_POSTED, 'Receipt already posted', 409);
        }

        // Get lines
        const lines = await queryTx<RowDataPacket[]>(
            connection,
            `SELECT prl.*, i.track_inventory
             FROM purchase_receipt_lines prl
             INNER JOIN items i ON i.id = prl.item_id
             WHERE prl.receipt_id = ?`,
            [receiptId]
        );

        // Update stock for each line
        for (const line of lines) {
            if (line.track_inventory) {
                await updateStock(connection, {
                    itemId: line.item_id,
                    qtyDelta: Number(line.qty),
                    unitCost: Number(line.unit_cost),
                    sourceType: SourceType.PURCHASE_RECEIPT,
                    sourceId: receiptId,
                    sourceLineId: line.id,
                    memo: `Receipt ${receipt.receipt_no}`,
                }, false);
            }
        }

        // Update receipt status
        await executeTx(
            connection,
            `UPDATE purchase_receipts SET status = 'POSTED', posted_at = NOW(), posted_by = ? WHERE id = ?`,
            [userId, receiptId]
        );

        // Store idempotency key
        await executeTx(
            connection,
            `INSERT INTO idempotency_keys (key_value, entity_type, entity_id, expires_at)
             VALUES (?, 'PURCHASE_RECEIPT', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [idempotencyKey, receiptId]
        );

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'POST',
            entityType: 'PURCHASE_RECEIPT',
            entityId: receiptId,
            afterData: { status: 'POSTED' },
        });
    });
}
