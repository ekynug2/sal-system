// =============================================================================
// SAL Accounting System - Sales Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx, getConnection } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { ErrorCodes, SourceType, DocumentStatus, DefaultAccountKeys } from '../../shared/constants';
import { getNextNumber, SequenceKeys } from './sequence.service';
import { createAuditLogTx } from './audit.service';
import { validateDateNotLocked } from './period-lock.service';
import { updateStock, checkStockAvailability } from './inventory.service';
import { createJournalEntry, getDefaultAccountId, getTaxAccounts, JournalLineInput } from './journal.service';
import type {
    SalesInvoice,
    SalesInvoiceLine,
    SalesPayment,
    PaymentAllocation,
    CreateSalesInvoiceInput,
    ReceivePaymentInput,
} from '../../shared/types';

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
        status: r.status as any,
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
        status: r.status as any,
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
 * Create sales invoice (draft)
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

        // Insert lines
        for (const line of processedLines) {
            await executeTx(
                connection,
                `INSERT INTO sales_invoice_lines 
         (invoice_id, line_no, item_id, description, qty, unit_price, discount_rate, discount_amount,
          tax_code, tax_rate, line_subtotal, line_tax, line_total, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
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
                    line.memo || null,
                ]
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
 * Post sales invoice
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
                .filter((l: any) => l.track_inventory)
                .map(l => ({ itemId: l.item_id, qty: Number(l.qty) }));

            if (stockItems.length > 0) {
                const stockCheck = await checkStockAvailability(connection, stockItems);
                if (!stockCheck.valid) {
                    throw new SalesError(
                        ErrorCodes.SLS_INV_POST_STOCK_NEGATIVE,
                        `Insufficient stock for ${stockCheck.insufficientItems.length} item(s)`,
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
            if ((line as any).track_inventory) {
                const avgCost = Number((line as any).avg_cost);
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
 * Receive payment
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
            if (!['POSTED', 'PARTIALLY_PAID'].includes(invoice.status)) {
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
        let bankAccountId = input.bankAccountId;
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

        for (const alloc of input.allocations) {
            // Insert allocation
            await executeTx(
                connection,
                'INSERT INTO sales_payment_allocations (payment_id, invoice_id, amount) VALUES (?, ?, ?)',
                [paymentId, alloc.invoiceId, alloc.amount]
            );

            // Update invoice paid amount
            const updateResult = await executeTx(
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
