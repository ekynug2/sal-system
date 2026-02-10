// =============================================================================
// SAL Accounting System - Sales Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx } from '../db';

import { ErrorCodes, SourceType, DefaultAccountKeys } from '../../shared/constants';
import { getNextNumber, SequenceKeys } from './sequence.service';
import { createAuditLogTx } from './audit.service';
import { validateDateNotLocked } from './period-lock.service';
import { updateStock, checkStockAvailability } from './inventory.service';
import { createJournalEntry, getDefaultAccountId, getTaxAccounts, JournalLineInput } from './journal.service';
import type {
    SalesInvoice,
    SalesInvoiceLine,
} from '../../shared/types';

// Input types (mirroring Zod schemas)
export interface CreateSalesInvoiceInput {
    customerId: number;
    invoiceDate: string;
    dueDate: string;
    currency?: string;
    lines: {
        itemId: number;
        qty: number;
        unitPrice: number;
        discountRate: number;
        taxCode: string;
        description?: string;
        memo?: string;
    }[];
    memo?: string;
    shippingFee?: number;
    shippingAddress?: string;
}

export interface ReceivePaymentInput {
    customerId: number;
    receivedDate: string;
    method: string;
    amountTotal: number;
    allocations: { invoiceId: number; amount: number }[];
    bankAccountId?: number;
    referenceNo?: string;
    memo?: string;
}

interface SalesInvoiceRow extends RowDataPacket {
    id: number;
    invoice_no: string;
    customer_id: number;
    customer_name: string;
    invoice_date: string;
    due_date: string;
    currency: string;
    status: string;
    subtotal: number;
    discount_amount: number;
    tax_total: number;
    shipping_fee: number;
    grand_total: number;
    paid_amount: number;
    balance_due: number;
    memo: string | null;
    posted_at: string | null;
    posted_by: number | null;
}

interface SalesInvoiceLineRow extends RowDataPacket {
    id: number;
    invoice_id: number;
    line_no: number;
    item_id: number;
    item_sku: string;
    item_name: string;
    description: string | null;
    qty: number;
    unit_price: number;
    discount_rate: number;
    discount_amount: number;
    tax_code: string;
    tax_rate: number;
    line_subtotal: number;
    line_tax: number;
    line_total: number;
    unit_cost: number;
    memo: string | null;
    track_inventory?: number;
    avg_cost?: number;
}

export class SalesError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'SalesError';
    }
}

// -----------------------------------------------------------------------------
// Invoice CRUD
// -----------------------------------------------------------------------------

/**
 * Get sales invoices list
 */
export async function getSalesInvoices(params: {
    customerId?: number;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}): Promise<{ invoices: SalesInvoice[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.customerId) {
        conditions.push('si.customer_id = ?');
        values.push(params.customerId);
    }

    if (params.status) {
        conditions.push('si.status = ?');
        values.push(params.status);
    }

    if (params.from) {
        conditions.push('si.invoice_date >= ?');
        values.push(params.from);
    }

    if (params.to) {
        conditions.push('si.invoice_date <= ?');
        values.push(params.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM sales_invoices si ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get invoices
    const rows = await query<SalesInvoiceRow[]>(
        `SELECT si.*, c.name as customer_name
     FROM sales_invoices si
     INNER JOIN customers c ON c.id = si.customer_id
     ${whereClause}
     ORDER BY si.invoice_date DESC, si.id DESC
     LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const invoices: SalesInvoice[] = rows.map(r => ({
        id: r.id,
        invoiceNo: r.invoice_no,
        customerId: r.customer_id,
        customerName: r.customer_name,
        invoiceDate: r.invoice_date,
        dueDate: r.due_date,
        currency: r.currency,
        status: r.status as SalesInvoice['status'],
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discount_amount),
        taxTotal: Number(r.tax_total),
        shippingFee: Number(r.shipping_fee),
        grandTotal: Number(r.grand_total),
        paidAmount: Number(r.paid_amount),
        balanceDue: Number(r.balance_due),
        memo: r.memo || undefined,
        postedAt: r.posted_at || undefined,
        postedBy: r.posted_by || undefined,
        lines: [],
    }));

    return { invoices, total };
}

/**
 * Get single sales invoice with lines
 */
export async function getSalesInvoice(id: number): Promise<SalesInvoice | null> {
    const rows = await query<SalesInvoiceRow[]>(
        `SELECT si.*, c.name as customer_name
     FROM sales_invoices si
     INNER JOIN customers c ON c.id = si.customer_id
     WHERE si.id = ?`,
        [id]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    const lines = await getInvoiceLines(id);

    return {
        id: r.id,
        invoiceNo: r.invoice_no,
        customerId: r.customer_id,
        customerName: r.customer_name,
        invoiceDate: r.invoice_date,
        dueDate: r.due_date,
        currency: r.currency,
        status: r.status as SalesInvoice['status'],
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discount_amount),
        taxTotal: Number(r.tax_total),
        shippingFee: Number(r.shipping_fee),
        grandTotal: Number(r.grand_total),
        paidAmount: Number(r.paid_amount),
        balanceDue: Number(r.balance_due),
        memo: r.memo || undefined,
        postedAt: r.posted_at || undefined,
        postedBy: r.posted_by || undefined,
        lines,
    };
}

/**
 * Get invoice lines
 */
async function getInvoiceLines(invoiceId: number): Promise<SalesInvoiceLine[]> {
    const rows = await query<SalesInvoiceLineRow[]>(
        `SELECT sil.*, i.sku as item_sku, i.name as item_name
     FROM sales_invoice_lines sil
     INNER JOIN items i ON i.id = sil.item_id
     WHERE sil.invoice_id = ?
     ORDER BY sil.line_no`,
        [invoiceId]
    );

    return rows.map(r => ({
        id: r.id,
        lineNo: r.line_no,
        itemId: r.item_id,
        itemSku: r.item_sku,
        itemName: r.item_name,
        description: r.description || undefined,
        qty: Number(r.qty),
        unitPrice: Number(r.unit_price),
        discountRate: Number(r.discount_rate),
        discountAmount: Number(r.discount_amount),
        taxCode: r.tax_code,
        taxRate: Number(r.tax_rate),
        lineSubtotal: Number(r.line_subtotal),
        lineTax: Number(r.line_tax),
        lineTotal: Number(r.line_total),
        unitCost: Number(r.unit_cost),
        memo: r.memo || undefined,
    }));
}

/**
 * Create a new sales invoice in Draft status.
 *
 * @param input - Invoice payload including customerId, invoiceDate, dueDate, optional currency, shippingFee, memo, shippingAddress, and `lines` (each line requires itemId, qty, unitPrice, discountRate, taxCode, and may include description and memo).
 * @param userId - ID of the user creating the invoice.
 * @returns The ID of the created invoice.
 */
export async function createSalesInvoice(
    input: CreateSalesInvoiceInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // Generate invoice number
        const invoiceNo = await getNextNumber(connection, SequenceKeys.SALES_INVOICE);

        // Get tax rates for lines
        const taxRates = new Map<string, number>();
        const taxCodes = [...new Set(input.lines.map(l => l.taxCode))];

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

        // Calculate totals
        let subtotal = 0;
        let taxTotal = 0;
        const processedLines: {
            lineNo: number;
            itemId: number;
            description?: string;
            qty: number;
            unitPrice: number;
            discountRate: number;
            discountAmount: number;
            taxCode: string;
            taxRate: number;
            lineSubtotal: number;
            lineTax: number;
            lineTotal: number;
            memo?: string;
        }[] = [];

        for (let i = 0; i < input.lines.length; i++) {
            const line = input.lines[i];
            const taxRate = taxRates.get(line.taxCode) || 0;

            const lineBase = line.qty * line.unitPrice;
            const lineDiscount = lineBase * (line.discountRate / 100);
            const lineSubtotal = lineBase - lineDiscount;
            const lineTax = lineSubtotal * taxRate;
            const lineTotal = lineSubtotal + lineTax;

            subtotal += lineSubtotal;
            taxTotal += lineTax;

            processedLines.push({
                lineNo: i + 1,
                itemId: line.itemId,
                description: line.description || undefined,
                qty: line.qty,
                unitPrice: line.unitPrice,
                discountRate: line.discountRate,
                discountAmount: lineDiscount,
                taxCode: line.taxCode,
                taxRate,
                lineSubtotal,
                lineTax,
                lineTotal,
                memo: line.memo || undefined,
            });
        }

        const grandTotal = subtotal + taxTotal + (input.shippingFee || 0);

        // Insert invoice
        const result = await executeTx(
            connection,
            `INSERT INTO sales_invoices 
       (invoice_no, customer_id, invoice_date, due_date, currency, status, 
        subtotal, discount_amount, tax_total, shipping_fee, grand_total, memo, shipping_address, created_by)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceNo,
                input.customerId,
                input.invoiceDate,
                input.dueDate,
                input.currency || 'IDR',
                subtotal,
                0, // global discount applied later if needed
                taxTotal,
                input.shippingFee || 0,
                grandTotal,
                input.memo || null,
                input.shippingAddress || null,
                userId,
            ]
        );

        const invoiceId = result.insertId;

        // Insert lines (Bulk)
        if (processedLines.length > 0) {
            const lineValues: (string | number | null)[] = [];
            const placeholders = processedLines.map(line => {
                lineValues.push(
                    invoiceId,
                    line.lineNo,
                    line.itemId,
                    line.description || null,
                    line.qty,
                    line.unitPrice,
                    line.discountRate,
                    line.discountAmount,
                    line.taxCode,
                    line.taxRate,
                    line.lineSubtotal,
                    line.lineTax,
                    line.lineTotal,
                    line.memo || null
                );
                return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            }).join(', ');

            await executeTx(
                connection,
                `INSERT INTO sales_invoice_lines 
                 (invoice_id, line_no, item_id, description, qty, unit_price, discount_rate, discount_amount,
                  tax_code, tax_rate, line_subtotal, line_tax, line_total, memo)
                 VALUES ${placeholders}`,
                lineValues
            );
        }

        // Create audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'CREATE',
            entityType: 'SALES_INVOICE',
            entityId: invoiceId,
            afterData: { invoiceNo, customerId: input.customerId, grandTotal },
        });

        return invoiceId;
    });
}

/**
 * Post a draft sales invoice by finalizing inventory, creating accounting journal entries, updating customer balance, and marking the invoice as posted.
 *
 * @param idempotencyKey - Unique key to ensure the operation is idempotent; if a matching key exists the function returns without side effects.
 * @param checkNegativeStock - When true, validates inventory availability and prevents posting if stock would become negative; when false, skips the availability check.
 *
 * @throws SalesError - `RESOURCE_NOT_FOUND` if the invoice does not exist.
 * @throws SalesError - `SLS_INV_ALREADY_POSTED` if the invoice is not in draft status.
 * @throws SalesError - `SLS_INV_POST_STOCK_NEGATIVE` if stock validation fails (includes `insufficientItems` details).
 */
export async function postSalesInvoice(
    invoiceId: number,
    userId: number,
    idempotencyKey: string,
    checkNegativeStock: boolean = true
): Promise<void> {
    return transaction(async (connection) => {
        // Check idempotency
        const existingKey = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT id, entity_id FROM idempotency_keys WHERE key_value = ?',
            [idempotencyKey]
        );

        if (existingKey.length > 0) {
            // Already processed, return success
            return;
        }

        // Lock and get invoice
        const invoiceRows = await queryTx<SalesInvoiceRow[]>(
            connection,
            `SELECT si.*, c.name as customer_name
       FROM sales_invoices si
       INNER JOIN customers c ON c.id = si.customer_id
       WHERE si.id = ? FOR UPDATE`,
            [invoiceId]
        );

        if (invoiceRows.length === 0) {
            throw new SalesError(ErrorCodes.RESOURCE_NOT_FOUND, 'Invoice not found', 404);
        }

        const invoice = invoiceRows[0];

        if (invoice.status !== 'DRAFT') {
            throw new SalesError(ErrorCodes.SLS_INV_ALREADY_POSTED, 'Invoice is not in draft status', 409);
        }

        // Check period lock
        await validateDateNotLocked(invoice.invoice_date, 'Invoice');

        // Get invoice lines
        const lineRows = await queryTx<SalesInvoiceLineRow[]>(
            connection,
            `SELECT sil.*, i.sku as item_sku, i.name as item_name, i.avg_cost, i.track_inventory
       FROM sales_invoice_lines sil
       INNER JOIN items i ON i.id = sil.item_id
       WHERE sil.invoice_id = ?`,
            [invoiceId]
        );

        // Check stock availability
        if (checkNegativeStock) {
            const stockItems = lineRows
                .filter(l => l.track_inventory)
                .map(l => ({ itemId: l.item_id, qty: Number(l.qty) }));

            if (stockItems.length > 0) {
                const stockCheck = await checkStockAvailability(connection, stockItems);
                if (!stockCheck.valid) {
                    throw new SalesError(
                        ErrorCodes.SLS_INV_POST_STOCK_NEGATIVE,
                        `Insufficient stock for: ${stockCheck.insufficientItems.map(i => i.sku).join(', ')}`,
                        409,
                        { insufficientItems: stockCheck.insufficientItems }
                    );
                }
            }
        }

        // Get default accounts
        const arAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.AR_TRADE);
        const salesAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.SALES_INCOME);
        const cogsAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.COGS);
        const inventoryAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.INVENTORY_ASSET);

        // Process each line
        let totalCogs = 0;
        for (const line of lineRows) {
            if (line.track_inventory) {
                const avgCost = Number(line.avg_cost);
                const qty = Number(line.qty);
                const lineCogs = qty * avgCost;
                totalCogs += lineCogs;

                // Update stock (decrease)
                await updateStock(connection, {
                    itemId: line.item_id,
                    qtyDelta: -qty,
                    unitCost: avgCost,
                    sourceType: SourceType.SALES_INVOICE,
                    sourceId: invoiceId,
                    sourceLineId: line.id,
                    memo: `Invoice ${invoice.invoice_no}`,
                }, checkNegativeStock);

                // Update line with cost
                await executeTx(
                    connection,
                    'UPDATE sales_invoice_lines SET unit_cost = ? WHERE id = ?',
                    [avgCost, line.id]
                );
            }
        }

        // Create journal entries
        const journalLines: JournalLineInput[] = [];

        // DR: AR (grand total)
        journalLines.push({
            accountId: arAccountId,
            dc: 'D',
            amount: Number(invoice.grand_total),
            memo: `AR - ${invoice.customer_name}`,
            entityType: 'CUSTOMER',
            entityId: invoice.customer_id,
        });

        // CR: Sales (subtotal)
        journalLines.push({
            accountId: salesAccountId,
            dc: 'C',
            amount: Number(invoice.subtotal),
            memo: 'Sales Income',
        });

        // CR: Tax Output (if any)
        if (Number(invoice.tax_total) > 0) {
            // Group tax by tax code
            const taxByCode = new Map<string, number>();
            for (const line of lineRows) {
                const current = taxByCode.get(line.tax_code) || 0;
                taxByCode.set(line.tax_code, current + Number(line.line_tax));
            }

            for (const [taxCode, taxAmount] of taxByCode) {
                const taxInfo = await getTaxAccounts(connection, taxCode);
                if (taxInfo.outputAccountId && taxAmount > 0) {
                    journalLines.push({
                        accountId: taxInfo.outputAccountId,
                        dc: 'C',
                        amount: taxAmount,
                        memo: `Tax Output - ${taxCode}`,
                    });
                }
            }
        }

        // DR: COGS
        if (totalCogs > 0) {
            journalLines.push({
                accountId: cogsAccountId,
                dc: 'D',
                amount: totalCogs,
                memo: 'Cost of Goods Sold',
            });

            // CR: Inventory
            journalLines.push({
                accountId: inventoryAccountId,
                dc: 'C',
                amount: totalCogs,
                memo: 'Inventory',
            });
        }

        await createJournalEntry(connection, {
            entryDate: invoice.invoice_date,
            sourceType: SourceType.SALES_INVOICE,
            sourceId: invoiceId,
            memo: `Invoice ${invoice.invoice_no} - ${invoice.customer_name}`,
            lines: journalLines,
            postedBy: userId,
        });

        // Update invoice status
        await executeTx(
            connection,
            `UPDATE sales_invoices SET status = 'POSTED', posted_at = NOW(), posted_by = ? WHERE id = ?`,
            [userId, invoiceId]
        );

        // Update customer balance
        await executeTx(
            connection,
            'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
            [invoice.grand_total, invoice.customer_id]
        );

        // Store idempotency key
        await executeTx(
            connection,
            `INSERT INTO idempotency_keys (key_value, entity_type, entity_id, expires_at)
       VALUES (?, 'SALES_INVOICE', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [idempotencyKey, invoiceId]
        );

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'POST',
            entityType: 'SALES_INVOICE',
            entityId: invoiceId,
            afterData: { status: 'POSTED', grandTotal: Number(invoice.grand_total), cogs: totalCogs },
        });
    });
}

/**
 * Records a customer payment, allocates amounts to invoices, creates accounting entries, and updates balances.
 *
 * @param input - Payment details including customer, received date, payment method, total amount, optional bank account, reference/memo, and allocations to invoices
 * @param userId - ID of the user performing the operation
 * @returns The newly created sales payment ID
 * @throws SalesError - if any validation fails (allocation totals mismatch, allocation exceeds invoice balance), if referenced resources are not found (invoice or bank account), or if invoice status prevents allocation
 */
export async function receivePayment(
    input: ReceivePaymentInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // Generate payment number
        const paymentNo = await getNextNumber(connection, SequenceKeys.SALES_PAYMENT);

        // Validate allocations
        let totalAllocated = 0;
        for (const alloc of input.allocations) {
            const invoiceRows = await queryTx<SalesInvoiceRow[]>(
                connection,
                'SELECT * FROM sales_invoices WHERE id = ? AND customer_id = ? FOR UPDATE',
                [alloc.invoiceId, input.customerId]
            );

            if (invoiceRows.length === 0) {
                throw new SalesError(ErrorCodes.RESOURCE_NOT_FOUND, `Invoice ${alloc.invoiceId} not found`, 404);
            }

            const invoice = invoiceRows[0];

            // Allow PARTIALLY_PAID status and ensure invoice is NOT PAID before accepting more money (unless overpayment logic exists, which is not here)
            // But we already check balance.
            // Status check:
            if (!['POSTED', 'PARTIALLY_PAID'].includes(invoice.status)) {
                // ... (Logic remains same, just ensuring context)

                throw new SalesError(
                    ErrorCodes.CONFLICT,
                    `Invoice ${invoice.invoice_no} is not in posted status`,
                    409
                );
            }

            const balanceDue = Number(invoice.grand_total) - Number(invoice.paid_amount);
            if (alloc.amount > balanceDue + 0.01) {
                throw new SalesError(
                    ErrorCodes.SLS_PAYMENT_EXCEEDS_BALANCE,
                    `Payment amount ${alloc.amount} exceeds invoice balance ${balanceDue}`,
                    409
                );
            }

            totalAllocated += alloc.amount;
        }

        if (Math.abs(totalAllocated - input.amountTotal) > 0.01) {
            throw new SalesError(
                ErrorCodes.VALIDATION_ERROR,
                `Total allocations ${totalAllocated} does not match payment amount ${input.amountTotal}`,
                422
            );
        }

        // Get bank account
        const bankAccountId = input.bankAccountId;
        let bankCoaId: number;

        if (bankAccountId) {
            const bankRows = await queryTx<RowDataPacket[]>(
                connection,
                'SELECT coa_id FROM bank_accounts WHERE id = ?',
                [bankAccountId]
            );
            if (bankRows.length === 0) {
                throw new SalesError(ErrorCodes.RESOURCE_NOT_FOUND, 'Bank account not found', 404);
            }
            bankCoaId = bankRows[0].coa_id;
        } else {
            // Default to cash on hand
            bankCoaId = await getDefaultAccountId(connection, DefaultAccountKeys.CASH_ON_HAND);
        }

        // Create payment record
        const result = await executeTx(
            connection,
            `INSERT INTO sales_payments 
       (payment_no, customer_id, received_date, method, bank_account_id, amount_total, reference_no, memo, posted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                paymentNo,
                input.customerId,
                input.receivedDate,
                input.method,
                bankAccountId || null,
                input.amountTotal,
                input.referenceNo || null,
                input.memo || null,
                userId,
            ]
        );

        const paymentId = result.insertId;

        // Create allocations and update invoices
        const arAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.AR_TRADE);

        // Create allocations (Bulk)
        if (input.allocations.length > 0) {
            const allocValues: (string | number | null)[] = [];
            const placeholders = input.allocations.map(alloc => {
                allocValues.push(paymentId, alloc.invoiceId, alloc.amount);
                return '(?, ?, ?)';
            });

            await executeTx(
                connection,
                `INSERT INTO sales_payment_allocations (payment_id, invoice_id, amount) VALUES ${placeholders.join(', ')}`,
                allocValues
            );

            // Update invoice statuses (Still sequential for safety/simplicity of paid status logic, 
            // but could be optimized using CASE in future if performance demands)
            for (const alloc of input.allocations) {
                await executeTx(
                    connection,
                    `UPDATE sales_invoices 
                     SET paid_amount = paid_amount + ?,
                         status = CASE 
                           WHEN paid_amount + ? >= grand_total THEN 'PAID'
                           ELSE 'PARTIALLY_PAID'
                         END
                     WHERE id = ?`,
                    [alloc.amount, alloc.amount, alloc.invoiceId]
                );
            }
        }

        // Create journal entry
        // Get customer name
        const customerRows = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT name FROM customers WHERE id = ?',
            [input.customerId]
        );
        const customerName = customerRows[0]?.name || 'Unknown';

        await createJournalEntry(connection, {
            entryDate: input.receivedDate,
            sourceType: SourceType.SALES_PAYMENT,
            sourceId: paymentId,
            memo: `Payment ${paymentNo} - ${customerName}`,
            lines: [
                {
                    accountId: bankCoaId,
                    dc: 'D',
                    amount: input.amountTotal,
                    memo: `Received from ${customerName}`,
                },
                {
                    accountId: arAccountId,
                    dc: 'C',
                    amount: input.amountTotal,
                    memo: `Payment from ${customerName}`,
                    entityType: 'CUSTOMER',
                    entityId: input.customerId,
                },
            ],
            postedBy: userId,
        });

        // Update customer balance
        await executeTx(
            connection,
            'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?',
            [input.amountTotal, input.customerId]
        );

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'CREATE',
            entityType: 'SALES_PAYMENT',
            entityId: paymentId,
            afterData: { paymentNo, amount: input.amountTotal, allocations: input.allocations },
        });

        return paymentId;
    });
}

// -----------------------------------------------------------------------------
// Get Sales Payments
// -----------------------------------------------------------------------------

interface SalesPaymentRow extends RowDataPacket {
    id: number;
    payment_no: string;
    customer_id: number;
    customer_name: string;
    received_date: string;
    method: string;
    bank_account_id: number | null;
    amount_total: number;
    reference_no: string | null;
    memo: string | null;
}

export async function getSalesPayments(params: {
    customerId?: number;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{ payments: import('../../shared/types').SalesPayment[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.customerId) {
        conditions.push('sp.customer_id = ?');
        values.push(params.customerId);
    }

    if (params.search) {
        conditions.push('(sp.payment_no LIKE ? OR c.name LIKE ? OR sp.reference_no LIKE ?)');
        const term = `%${params.search}%`;
        values.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM sales_payments sp
         INNER JOIN customers c ON c.id = sp.customer_id
         ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get payments
    const rows = await query<SalesPaymentRow[]>(
        `SELECT sp.*, c.name as customer_name
         FROM sales_payments sp
         INNER JOIN customers c ON c.id = sp.customer_id
         ${whereClause}
         ORDER BY sp.received_date DESC, sp.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const payments = rows.map(r => ({
        id: r.id,
        paymentNo: r.payment_no,
        customerId: r.customer_id,
        customerName: r.customer_name,
        receivedDate: r.received_date,
        method: r.method as import('../../shared/types').PaymentMethod,
        bankAccountId: r.bank_account_id || undefined,
        amountTotal: Number(r.amount_total),
        referenceNo: r.reference_no || undefined,
        memo: r.memo || undefined,
        allocations: [], // Can be fetched separately if needed
    }));

    return { payments, total };
}

// -----------------------------------------------------------------------------
// Sales Credit Notes
// -----------------------------------------------------------------------------

export interface CreateCreditNoteInput {
    invoiceId: number;
    creditDate: string;
    reasonCode: string;
    restock: boolean;
    lines: {
        itemId: number;
        qty: number;
        unitPrice: number;
        taxCode: string;
        memo?: string;
    }[];
    memo?: string;
}

interface CreditNoteRow extends RowDataPacket {
    id: number;
    credit_note_no: string;
    invoice_id: number;
    invoice_no: string;
    customer_id: number;
    customer_name: string;
    credit_date: string;
    status: string;
    reason_code: string;
    restock: number;
    subtotal: number;
    tax_total: number;
    grand_total: number;
    memo: string | null;
}

export async function getSalesCreditNotes(params: {
    customerId?: number;
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{ creditNotes: import('../../shared/types').SalesCreditNote[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.customerId) {
        conditions.push('cn.customer_id = ?');
        values.push(params.customerId);
    }

    if (params.status) {
        conditions.push('cn.status = ?');
        values.push(params.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM sales_credit_notes cn ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get credit notes
    const rows = await query<CreditNoteRow[]>(
        `SELECT cn.*, 
                si.invoice_no, 
                c.name as customer_name,
                c.id as customer_id
         FROM sales_credit_notes cn
         INNER JOIN sales_invoices si ON si.id = cn.invoice_id
         INNER JOIN customers c ON c.id = si.customer_id
         ${whereClause}
         ORDER BY cn.credit_date DESC, cn.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const creditNotes = rows.map(r => ({
        id: r.id,
        creditNoteNo: r.credit_note_no,
        invoiceId: r.invoice_id,
        invoiceNo: r.invoice_no,
        customerId: r.customer_id,
        customerName: r.customer_name,
        creditDate: r.credit_date,
        status: r.status as import('../../shared/types').DocumentStatus,
        reasonCode: r.reason_code as import('../../shared/types').CreditNoteReasonCode,
        restock: r.restock === 1,
        subtotal: Number(r.subtotal),
        taxTotal: Number(r.tax_total),
        grandTotal: Number(r.grand_total),
        memo: r.memo || undefined,
        lines: [],
    }));

    return { creditNotes, total };
}

/**
 * Create a draft sales credit note linked to an existing invoice.
 *
 * Creates database records for the credit note and its lines, computes totals (subtotal, tax, grand total),
 * and writes an audit log entry.
 *
 * @param input - Credit note data including `invoiceId`, `creditDate`, `lines` (each with itemId, qty, unitPrice, taxCode, optional memo), `restock`, `reasonCode`, and optional `memo`
 * @param userId - Identifier of the user performing the creation
 * @returns The newly created credit note ID
 * @throws SalesError when the referenced invoice cannot be found (error code RESOURCE_NOT_FOUND)
 */
export async function createSalesCreditNote(
    input: CreateCreditNoteInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // Generate credit note number
        const creditNoteNo = await getNextNumber(connection, SequenceKeys.CREDIT_NOTE);

        // Get invoice info
        const invoiceRows = await queryTx<SalesInvoiceRow[]>(
            connection,
            `SELECT si.*, c.name as customer_name 
             FROM sales_invoices si 
             INNER JOIN customers c ON c.id = si.customer_id 
             WHERE si.id = ?`,
            [input.invoiceId]
        );

        if (invoiceRows.length === 0) {
            throw new SalesError(ErrorCodes.RESOURCE_NOT_FOUND, 'Invoice not found', 404);
        }

        // Invoice existence verified above, data not needed for credit note creation

        // Get tax rates for lines
        const taxRates = new Map<string, number>();
        for (const line of input.lines) {
            if (!taxRates.has(line.taxCode)) {
                const taxInfo = await getTaxAccounts(connection, line.taxCode);
                taxRates.set(line.taxCode, taxInfo.rate);
            }
        }

        // Calculate totals
        let subtotal = 0;
        let taxTotal = 0;
        const processedLines: {
            lineNo: number;
            itemId: number;
            qty: number;
            unitPrice: number;
            taxCode: string;
            taxRate: number;
            lineSubtotal: number;
            lineTax: number;
            lineTotal: number;
            memo?: string;
        }[] = [];

        for (let i = 0; i < input.lines.length; i++) {
            const line = input.lines[i];
            const taxRate = taxRates.get(line.taxCode) || 0;

            const lineSubtotal = line.qty * line.unitPrice;
            const lineTax = lineSubtotal * taxRate;
            const lineTotal = lineSubtotal + lineTax;

            subtotal += lineSubtotal;
            taxTotal += lineTax;

            processedLines.push({
                lineNo: i + 1,
                itemId: line.itemId,
                qty: line.qty,
                unitPrice: line.unitPrice,
                taxCode: line.taxCode,
                taxRate,
                lineSubtotal,
                lineTax,
                lineTotal,
                memo: line.memo,
            });
        }

        const grandTotal = subtotal + taxTotal;

        // Insert credit note header
        const result = await executeTx(
            connection,
            `INSERT INTO sales_credit_notes 
             (credit_note_no, invoice_id, credit_date, status, reason_code, restock, 
              subtotal, tax_total, grand_total, memo, created_by)
             VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?)`,
            [
                creditNoteNo,
                input.invoiceId,
                input.creditDate,
                input.reasonCode,
                input.restock ? 1 : 0,
                subtotal,
                taxTotal,
                grandTotal,
                input.memo || null,
                userId,
            ]
        );

        const creditNoteId = result.insertId;

        // Insert lines
        for (const line of processedLines) {
            await executeTx(
                connection,
                `INSERT INTO sales_credit_note_lines 
                 (credit_note_id, line_no, item_id, qty, unit_price, tax_code, tax_rate, 
                  line_subtotal, line_tax, line_total, memo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    creditNoteId,
                    line.lineNo,
                    line.itemId,
                    line.qty,
                    line.unitPrice,
                    line.taxCode,
                    line.taxRate,
                    line.lineSubtotal,
                    line.lineTax,
                    line.lineTotal,
                    line.memo || null,
                ]
            );
        }

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'CREATE',
            entityType: 'SALES_CREDIT_NOTE',
            entityId: creditNoteId,
            afterData: { creditNoteNo, invoiceId: input.invoiceId, grandTotal },
        });

        return creditNoteId;
    });
}

export async function postSalesCreditNote(
    creditNoteId: number,
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

        // Lock and get credit note
        const cnRows = await queryTx<CreditNoteRow[]>(
            connection,
            `SELECT cn.*, si.invoice_no, c.name as customer_name, si.customer_id
             FROM sales_credit_notes cn
             INNER JOIN sales_invoices si ON si.id = cn.invoice_id
             INNER JOIN customers c ON c.id = si.customer_id
             WHERE cn.id = ? FOR UPDATE`,
            [creditNoteId]
        );

        if (cnRows.length === 0) {
            throw new SalesError(ErrorCodes.RESOURCE_NOT_FOUND, 'Credit note not found', 404);
        }

        const cn = cnRows[0];

        if (cn.status !== 'DRAFT') {
            throw new SalesError(ErrorCodes.CONFLICT, 'Credit note is not in draft status', 409);
        }

        // Get lines
        const lines = await queryTx<RowDataPacket[]>(
            connection,
            `SELECT cnl.*, i.avg_cost, i.track_inventory
             FROM sales_credit_note_lines cnl
             INNER JOIN items i ON i.id = cnl.item_id
             WHERE cnl.credit_note_id = ?`,
            [creditNoteId]
        );

        // Get default accounts
        const arAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.AR_TRADE);
        const salesAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.SALES_INCOME);
        const inventoryAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.INVENTORY_ASSET);

        // Process restock if needed
        let totalRestockValue = 0;
        if (cn.restock === 1) {
            for (const line of lines) {
                if (line.track_inventory) {
                    const qty = Number(line.qty);
                    const avgCost = Number(line.avg_cost);
                    totalRestockValue += qty * avgCost;

                    // Add back to stock
                    await updateStock(connection, {
                        itemId: line.item_id,
                        qtyDelta: qty,
                        unitCost: avgCost,
                        sourceType: SourceType.CREDIT_NOTE,
                        sourceId: creditNoteId,
                        sourceLineId: line.id,
                        memo: `Return from CN ${cn.credit_note_no}`,
                    }, false);
                }
            }
        }

        // Create journal entries (reverse of invoice)
        const journalLines: JournalLineInput[] = [];

        // DR: Sales (reverse income)
        journalLines.push({
            accountId: salesAccountId,
            dc: 'D',
            amount: Number(cn.subtotal),
            memo: 'Sales Return',
        });

        // CR: AR (reduce receivable)
        journalLines.push({
            accountId: arAccountId,
            dc: 'C',
            amount: Number(cn.grand_total),
            memo: `Credit Note - ${cn.customer_name}`,
            entityType: 'CUSTOMER',
            entityId: cn.customer_id,
        });

        // Handle tax reversal
        if (Number(cn.tax_total) > 0) {
            const taxByCode = new Map<string, number>();
            for (const line of lines) {
                const current = taxByCode.get(line.tax_code) || 0;
                taxByCode.set(line.tax_code, current + Number(line.line_tax));
            }

            for (const [taxCode, taxAmount] of taxByCode) {
                const taxInfo = await getTaxAccounts(connection, taxCode);
                if (taxInfo.outputAccountId && taxAmount > 0) {
                    journalLines.push({
                        accountId: taxInfo.outputAccountId,
                        dc: 'D',
                        amount: taxAmount,
                        memo: `Tax Reversal - ${taxCode}`,
                    });
                }
            }
        }

        // If restocking, DR Inventory, CR COGS (reverse)
        if (totalRestockValue > 0) {
            journalLines.push({
                accountId: inventoryAccountId,
                dc: 'D',
                amount: totalRestockValue,
                memo: 'Inventory Return',
            });

            const cogsAccountId = await getDefaultAccountId(connection, DefaultAccountKeys.COGS);
            journalLines.push({
                accountId: cogsAccountId,
                dc: 'C',
                amount: totalRestockValue,
                memo: 'COGS Reversal',
            });
        }

        await createJournalEntry(connection, {
            entryDate: cn.credit_date,
            sourceType: SourceType.CREDIT_NOTE,
            sourceId: creditNoteId,
            memo: `Credit Note ${cn.credit_note_no} - ${cn.customer_name}`,
            lines: journalLines,
            postedBy: userId,
        });

        // Update credit note status
        await executeTx(
            connection,
            `UPDATE sales_credit_notes SET status = 'POSTED', posted_at = NOW(), posted_by = ? WHERE id = ?`,
            [userId, creditNoteId]
        );

        // Update customer balance
        await executeTx(
            connection,
            'UPDATE customers SET current_balance = current_balance - ? WHERE id = ?',
            [cn.grand_total, cn.customer_id]
        );

        // Store idempotency key
        await executeTx(
            connection,
            `INSERT INTO idempotency_keys (key_value, entity_type, entity_id, expires_at)
             VALUES (?, 'SALES_CREDIT_NOTE', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [idempotencyKey, creditNoteId]
        );

        // Audit log
        await createAuditLogTx(connection, {
            actorUserId: userId,
            action: 'POST',
            entityType: 'SALES_CREDIT_NOTE',
            entityId: creditNoteId,
            afterData: { status: 'POSTED', grandTotal: Number(cn.grand_total) },
        });
    });
}