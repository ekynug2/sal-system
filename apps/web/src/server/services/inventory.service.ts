// =============================================================================
// SAL Accounting System - Inventory Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { query, transaction, queryTx, executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';
import { ErrorCodes } from '../../shared/constants';
import { getNextNumber, SequenceKeys } from './sequence.service';
import { createAuditLogTx } from './audit.service';
import type { StockLedgerEntry, ItemStock, InventoryAdjustment } from '../../shared/types';

interface ItemStockRow extends RowDataPacket {
    item_id: number;
    sku: string;
    name: string;
    on_hand: number;
    on_order: number;
    committed: number;
    available: number;
    stock_value: number;
    avg_cost: number;
}

interface StockLedgerRow extends RowDataPacket {
    id: number;
    occurred_at: string;
    item_id: number;
    sku: string;
    item_name: string;
    source_type: string;
    source_id: number;
    qty_delta: number;
    unit_cost: number;
    value_delta: number;
    balance_qty: number;
    balance_value: number;
    avg_cost_after: number;
    memo: string | null;
}

export class InventoryError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'InventoryError';
    }
}

// -----------------------------------------------------------------------------
// Stock Queries
// -----------------------------------------------------------------------------

/**
 * Get stock on hand for all items
 */
export async function getStockOnHand(categoryId?: number): Promise<ItemStock[]> {
    let sql = `
    SELECT 
      ist.item_id, i.sku, i.name,
      ist.on_hand, ist.on_order, ist.committed, ist.available,
      ist.stock_value, i.avg_cost
    FROM item_stock ist
    INNER JOIN items i ON i.id = ist.item_id
    WHERE i.is_active = 1 AND i.track_inventory = 1
  `;

    const params: (string | number)[] = [];

    if (categoryId) {
        sql += ' AND i.category_id = ?';
        params.push(categoryId);
    }

    sql += ' ORDER BY i.sku';

    const rows = await query<ItemStockRow[]>(sql, params);

    return rows.map(r => ({
        itemId: r.item_id,
        itemSku: r.sku,
        itemName: r.name,
        onHand: Number(r.on_hand),
        onOrder: Number(r.on_order),
        committed: Number(r.committed),
        available: Number(r.available),
        stockValue: Number(r.stock_value),
        avgCost: Number(r.avg_cost),
    }));
}

/**
 * Get stock for a specific item
 */
export async function getItemStock(itemId: number): Promise<ItemStock | null> {
    const rows = await query<ItemStockRow[]>(
        `SELECT 
      ist.item_id, i.sku as sku, i.name as name,
      ist.on_hand, ist.on_order, ist.committed, ist.available,
      ist.stock_value, i.avg_cost
     FROM item_stock ist
     INNER JOIN items i ON i.id = ist.item_id
     WHERE ist.item_id = ?`,
        [itemId]
    );

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
        itemId: r.item_id,
        itemSku: r.sku,
        itemName: r.name,
        onHand: Number(r.on_hand),
        onOrder: Number(r.on_order),
        committed: Number(r.committed),
        available: Number(r.available),
        stockValue: Number(r.stock_value),
        avgCost: Number(r.avg_cost),
    };
}

/**
 * Get stock ledger entries
 */
export async function getStockLedger(params: {
    itemId?: number;
    from?: string;
    to?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
}): Promise<{ entries: StockLedgerEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.itemId) {
        conditions.push('sl.item_id = ?');
        values.push(params.itemId);
    }

    if (params.from) {
        conditions.push('sl.occurred_at >= ?');
        values.push(params.from);
    }

    if (params.to) {
        conditions.push('sl.occurred_at <= ?');
        values.push(params.to + ' 23:59:59');
    }

    if (params.sourceType) {
        conditions.push('sl.source_type = ?');
        values.push(params.sourceType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM stock_ledger sl ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get entries
    const rows = await query<StockLedgerRow[]>(
        `SELECT 
      sl.id, sl.occurred_at, sl.item_id,
      i.sku, i.name as item_name,
      sl.source_type, sl.source_id, sl.qty_delta, sl.unit_cost,
      sl.value_delta, sl.balance_qty, sl.balance_value, sl.avg_cost_after, sl.memo
     FROM stock_ledger sl
     INNER JOIN items i ON i.id = sl.item_id
     ${whereClause}
     ORDER BY sl.occurred_at DESC, sl.id DESC
     LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const entries: StockLedgerEntry[] = rows.map(r => ({
        id: r.id,
        occurredAt: r.occurred_at,
        itemId: r.item_id,
        itemSku: r.sku,
        itemName: r.item_name,
        sourceType: r.source_type,
        sourceId: r.source_id,
        qtyDelta: Number(r.qty_delta),
        unitCost: Number(r.unit_cost),
        valueDelta: Number(r.value_delta),
        balanceQty: Number(r.balance_qty),
        balanceValue: Number(r.balance_value),
        avgCostAfter: Number(r.avg_cost_after),
        memo: r.memo || undefined,
    }));

    return { entries, total };
}

// -----------------------------------------------------------------------------
// Stock Operations (within transaction)
// -----------------------------------------------------------------------------

interface StockUpdate {
    itemId: number;
    qtyDelta: number;
    unitCost: number;
    sourceType: string;
    sourceId: number;
    sourceLineId?: number;
    memo?: string;
}

/**
 * Update stock for an item (issue or receive)
 * Must be called within a transaction
 */
export async function updateStock(
    connection: PoolConnection,
    update: StockUpdate,
    checkNegative: boolean = true
): Promise<{ balanceQty: number; balanceValue: number; avgCostAfter: number }> {
    // Lock item_stock row
    const stockRows = await queryTx<ItemStockRow[]>(
        connection,
        `SELECT ist.*, i.avg_cost 
     FROM item_stock ist
     INNER JOIN items i ON i.id = ist.item_id
     WHERE ist.item_id = ? FOR UPDATE`,
        [update.itemId]
    );

    let currentOnHand = 0;
    let currentStockValue = 0;
    let currentAvgCost = 0;

    if (stockRows.length === 0) {
        // Initialize stock record if not exists
        await executeTx(
            connection,
            'INSERT INTO item_stock (item_id, on_hand, stock_value) VALUES (?, 0, 0)',
            [update.itemId]
        );
    } else {
        currentOnHand = Number(stockRows[0].on_hand);
        currentStockValue = Number(stockRows[0].stock_value);
        currentAvgCost = Number(stockRows[0].avg_cost);
    }

    // Check negative stock
    if (checkNegative && update.qtyDelta < 0) {
        const newQty = currentOnHand + update.qtyDelta;
        if (newQty < 0) {
            throw new InventoryError(
                ErrorCodes.INV_NEGATIVE_STOCK,
                `Insufficient stock for item ${update.itemId}. Current: ${currentOnHand}, Requested: ${Math.abs(update.qtyDelta)}`,
                409,
                { itemId: update.itemId, currentOnHand, requested: Math.abs(update.qtyDelta) }
            );
        }
    }

    // Calculate new balances
    let newOnHand: number;
    let newStockValue: number;
    let newAvgCost: number;
    let valueDelta: number;

    if (update.qtyDelta > 0) {
        // Receiving stock - update average cost
        newOnHand = currentOnHand + update.qtyDelta;
        valueDelta = update.qtyDelta * update.unitCost;
        newStockValue = currentStockValue + valueDelta;
        newAvgCost = newOnHand > 0 ? newStockValue / newOnHand : update.unitCost;
    } else {
        // Issuing stock - use current average cost
        const issueQty = Math.abs(update.qtyDelta);
        valueDelta = -(issueQty * currentAvgCost);
        newOnHand = currentOnHand - issueQty;
        newStockValue = Math.max(0, currentStockValue + valueDelta);
        newAvgCost = newOnHand > 0 ? newStockValue / newOnHand : currentAvgCost;
    }

    // Update item_stock
    await executeTx(
        connection,
        'UPDATE item_stock SET on_hand = ?, stock_value = ?, updated_at = NOW() WHERE item_id = ?',
        [newOnHand, newStockValue, update.itemId]
    );

    // Update items.avg_cost
    await executeTx(
        connection,
        'UPDATE items SET avg_cost = ?, updated_at = NOW() WHERE id = ?',
        [newAvgCost, update.itemId]
    );

    // Insert stock ledger entry
    await executeTx(
        connection,
        `INSERT INTO stock_ledger 
     (item_id, source_type, source_id, source_line_id, qty_delta, unit_cost, value_delta, balance_qty, balance_value, avg_cost_after, memo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            update.itemId,
            update.sourceType,
            update.sourceId,
            update.sourceLineId || null,
            update.qtyDelta,
            update.qtyDelta > 0 ? update.unitCost : currentAvgCost,
            valueDelta,
            newOnHand,
            newStockValue,
            newAvgCost,
            update.memo || null,
        ]
    );

    return {
        balanceQty: newOnHand,
        balanceValue: newStockValue,
        avgCostAfter: newAvgCost,
    };
}

/**
 * Check if all items have sufficient stock
 */
export async function checkStockAvailability(
    connection: PoolConnection,
    items: { itemId: number; qty: number }[]
): Promise<{ valid: boolean; insufficientItems: { itemId: number; sku: string; available: number; requested: number }[] }> {
    const insufficientItems: { itemId: number; sku: string; available: number; requested: number }[] = [];

    for (const item of items) {
        const rows = await queryTx<ItemStockRow[]>(
            connection,
            `SELECT ist.on_hand, i.sku
       FROM item_stock ist
       INNER JOIN items i ON i.id = ist.item_id
       WHERE ist.item_id = ?`,
            [item.itemId]
        );

        const onHand = rows.length > 0 ? Number(rows[0].on_hand) : 0;
        if (onHand < item.qty) {
            insufficientItems.push({
                itemId: item.itemId,
                sku: rows[0]?.sku || 'UNKNOWN',
                available: onHand,
                requested: item.qty,
            });
        }
    }

    return {
        valid: insufficientItems.length === 0,
        insufficientItems,
    };
}
// -----------------------------------------------------------------------------
// Inventory Adjustment
// -----------------------------------------------------------------------------

export interface CreateInventoryAdjustmentInput {
    adjDate: string;
    adjustmentType: 'MANUAL' | 'OPNAME';
    memo?: string;
    lines: {
        itemId: number;
        qtyDelta: number; // For MANUAL: adjustment qty. For OPNAME: actual qty - system qty (calculated by caller or passed directly)
        unitCost?: number; // Optional override, otherwise uses current avg cost
        reasonCode: string; // 'DAMAGED', 'EXPIRED', 'FOUND', etc.
        memo?: string;
    }[];
}

interface InventoryAdjustmentRow extends RowDataPacket {
    id: number;
    adjustment_no: string;
    adj_date: Date;
    status: string;
    adjustment_type: string;
    memo: string | null;
}

export async function createInventoryAdjustment(
    input: CreateInventoryAdjustmentInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // 1. Get next number
        const adjNo = await getNextNumber(connection, SequenceKeys.ADJUSTMENT);

        // 2. Insert header
        const result = await executeTx(
            connection,
            `INSERT INTO inventory_adjustments 
             (adjustment_no, adj_date, status, adjustment_type, memo, created_by, created_at, updated_at)
             VALUES (?, ?, 'DRAFT', ?, ?, ?, NOW(), NOW())`,
            [adjNo, input.adjDate, input.adjustmentType, input.memo || null, userId]
        );
        const adjId = result.insertId;

        // 3. Insert lines
        let lineNo = 1;
        for (const line of input.lines) {
            await executeTx(
                connection,
                `INSERT INTO inventory_adjustment_lines
                 (adjustment_id, line_no, item_id, qty_delta, unit_cost, reason_code, memo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    adjId,
                    lineNo++,
                    line.itemId,
                    line.qtyDelta,
                    line.unitCost || 0, // 0 means use current cost at posting time
                    line.reasonCode,
                    line.memo || null,
                ]
            );
        }

        // 4. Audit Log
        await createAuditLogTx(connection, {
            action: 'CREATE',
            entityType: 'INVENTORY_ADJUSTMENT',
            entityId: adjId,
            actorUserId: userId,
            metadata: { adjNo, type: input.adjustmentType, lineCount: input.lines.length },
        });

        return adjId;
    });
}

export async function getInventoryAdjustments(params: {
    page?: number;
    limit?: number;
}): Promise<{ adjustments: InventoryAdjustment[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await query<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM inventory_adjustments'
    );
    const total = countResult[0]?.total || 0;

    const rows = await query<InventoryAdjustmentRow[]>(
        `SELECT * FROM inventory_adjustments 
         ORDER BY adj_date DESC, id DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    const adjustments = rows.map(r => ({
        id: r.id,
        adjustmentNo: r.adjustment_no,
        adjDate: r.adj_date.toISOString(),
        status: r.status as any,
        adjustmentType: r.adjustment_type as any,
        memo: r.memo || undefined,
        lines: [], // Lines fetched separately if needed, or join query
    }));

    return { adjustments, total };
}

export async function getInventoryAdjustment(id: number): Promise<InventoryAdjustment | null> {
    const rows = await query<InventoryAdjustmentRow[]>(
        'SELECT * FROM inventory_adjustments WHERE id = ?',
        [id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Get lines
    const lineRows = await query<any[]>(
        `SELECT ial.*, i.sku, i.name as item_name
         FROM inventory_adjustment_lines ial
         JOIN items i ON i.id = ial.item_id
         WHERE ial.adjustment_id = ?
         ORDER BY ial.line_no`,
        [id]
    );

    const lines = lineRows.map(l => ({
        lineNo: l.line_no,
        itemId: l.item_id,
        itemSku: l.sku,
        itemName: l.item_name,
        qtyBefore: 0, // Snapshot not stored currently, could add to table
        qtyCounted: 0,
        qtyDelta: Number(l.qty_delta),
        unitCost: Number(l.unit_cost),
        valueDelta: 0,
        reasonCode: l.reason_code,
        memo: l.memo || undefined,
    }));

    return {
        id: r.id,
        adjustmentNo: r.adjustment_no,
        adjDate: r.adj_date.toISOString(),
        status: r.status as any,
        adjustmentType: r.adjustment_type as any,
        memo: r.memo || undefined,
        lines,
    };
}

export async function postInventoryAdjustment(id: number, userId: number): Promise<void> {
    return transaction(async (connection) => {
        // 1. Get header & lock
        const rows = await queryTx<InventoryAdjustmentRow[]>(
            connection,
            'SELECT * FROM inventory_adjustments WHERE id = ? FOR UPDATE',
            [id]
        );
        if (rows.length === 0) throw new Error('Adjustment not found');
        const adj = rows[0];

        if (adj.status !== 'DRAFT') {
            throw new Error(`Cannot post adjustment with status ${adj.status}`);
        }

        // 2. Get lines
        const lines = await queryTx<any[]>(
            connection,
            'SELECT * FROM inventory_adjustment_lines WHERE adjustment_id = ? ORDER BY line_no',
            [id]
        );

        // 3. Process each line
        for (const line of lines) {
            const qtyDelta = Number(line.qty_delta);
            let unitCost = Number(line.unit_cost);

            // If unitCost is 0 or negative qty, fetch current cost
            if (unitCost === 0 || qtyDelta < 0) {
                const itemStock = await getItemStock(line.item_id); // This is outside transaction context if we use exported function directy, be careful. Better re-implement basic query inside loop or pass connection
                // Re-query safely within tx
                const [itemRow] = await queryTx<RowDataPacket[]>(
                    connection,
                    'SELECT avg_cost FROM items WHERE id = ?',
                    [line.item_id]
                );
                if (itemRow) unitCost = Number(itemRow.avg_cost);
            }

            // Update Stock
            const { avgCostAfter } = await updateStock(connection, {
                itemId: line.item_id,
                qtyDelta: qtyDelta,
                unitCost: unitCost,
                sourceType: 'ADJUSTMENT',
                sourceId: id,
                sourceLineId: line.id,
                memo: `Adj: ${adj.adjustment_no} - ${line.reason_code}`,
            }, false); // Allow negative stock for adjustments usually? Maybe configurable. Let's allow explicit override

            // Update line with actual cost used
            await executeTx(
                connection,
                'UPDATE inventory_adjustment_lines SET unit_cost = ?, value_delta = ? WHERE id = ?',
                [unitCost, qtyDelta * unitCost, line.id]
            );
        }

        // 4. Update Header Status
        await executeTx(
            connection,
            `UPDATE inventory_adjustments 
             SET status = 'POSTED', posted_by = ?, posted_at = NOW(), updated_at = NOW() 
             WHERE id = ?`,
            [userId, id]
        );

        // 5. Audit Log
        await createAuditLogTx(connection, {
            action: 'POST',
            entityType: 'INVENTORY_ADJUSTMENT',
            entityId: id,
            actorUserId: userId,
            metadata: { adjNo: adj.adjustment_no },
        });
    });
}
