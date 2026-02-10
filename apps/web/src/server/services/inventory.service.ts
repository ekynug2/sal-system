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

    if (items.length > 0) {
        const itemIds = items.map(i => i.itemId);
        // Fetch all needed stock in one query
        const stockRows = await queryTx<ItemStockRow[]>(
            connection,
            `SELECT ist.item_id, ist.on_hand, i.sku
             FROM item_stock ist
             INNER JOIN items i ON i.id = ist.item_id
             WHERE ist.item_id IN (${itemIds.map(() => '?').join(',')})`,
            itemIds
        );

        const stockMap = new Map<number, { onHand: number; sku: string }>();
        for (const row of stockRows) {
            stockMap.set(row.item_id, { onHand: Number(row.on_hand), sku: row.sku });
        }

        for (const item of items) {
            const stockInfo = stockMap.get(item.itemId);
            const onHand = stockInfo ? stockInfo.onHand : 0;
            const sku = stockInfo ? stockInfo.sku : 'UNKNOWN';

            if (onHand < item.qty) {
                insufficientItems.push({
                    itemId: item.itemId,
                    sku,
                    available: onHand,
                    requested: item.qty,
                });
            }
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

interface AdjustmentLineRow extends RowDataPacket {
    id: number;
    adjustment_id: number;
    line_no: number;
    item_id: number;
    qty_delta: number;
    unit_cost: number;
    reason_code: string;
    memo: string | null;
    sku?: string;
    item_name?: string;
}

/**
 * Creates a draft inventory adjustment with its lines and records an audit log.
 *
 * @param input - Adjustment header and line details (date, type, memo, and lines)
 * @param userId - ID of the user creating the adjustment
 * @returns The ID of the newly created inventory adjustment
 */
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
             (adjustment_no, adj_date, status, adjustment_type, memo, created_by, created_at)
             VALUES (?, ?, 'DRAFT', ?, ?, ?, NOW())`,
            [adjNo, input.adjDate, input.adjustmentType, input.memo || null, userId]
        );
        const adjId = result.insertId;

        // 3. Insert lines
        let lineNo = 1;
        // 3. Insert lines (Bulk)
        if (input.lines.length > 0) {
            const lineValues: (string | number | null)[] = [];
            const placeholders = input.lines.map(line => {
                lineValues.push(
                    adjId,
                    lineNo++,
                    line.itemId,
                    line.qtyDelta,
                    line.unitCost || 0,
                    line.reasonCode,
                    line.memo || null
                );
                return '(?, ?, ?, ?, ?, ?, ?)';
            }).join(', ');

            await executeTx(
                connection,
                `INSERT INTO inventory_adjustment_lines
                 (adjustment_id, line_no, item_id, qty_delta, unit_cost, reason_code, memo)
                 VALUES ${placeholders}`,
                lineValues
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
        status: r.status as InventoryAdjustment['status'],
        adjustmentType: r.adjustment_type as InventoryAdjustment['adjustmentType'],
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
    const lineRows = await query<AdjustmentLineRow[]>(
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
        reasonCode: l.reason_code as InventoryAdjustment['lines'][number]['reasonCode'],
        memo: l.memo || undefined,
    }));

    return {
        id: r.id,
        adjustmentNo: r.adjustment_no,
        adjDate: r.adj_date.toISOString(),
        status: r.status as InventoryAdjustment['status'],
        adjustmentType: r.adjustment_type as InventoryAdjustment['adjustmentType'],
        memo: r.memo || undefined,
        lines,
    };
}

/**
 * Posts a draft inventory adjustment: applies each adjustment line to stock, records used unit costs and value deltas, marks the adjustment as POSTED, and creates an audit log.
 *
 * @param id - The inventory adjustment ID to post
 * @param userId - The user ID performing the post action
 * @throws Error if the adjustment does not exist or is not in `DRAFT` status
 */
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
        const lines = await queryTx<AdjustmentLineRow[]>(
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
                // This is outside transaction context if we use exported function directy, be careful. Better re-implement basic query inside loop or pass connection
                // Re-query safely within tx
                const [itemRow] = await queryTx<RowDataPacket[]>(
                    connection,
                    'SELECT avg_cost FROM items WHERE id = ?',
                    [line.item_id]
                );
                if (itemRow) unitCost = Number(itemRow.avg_cost);
            }

            // Update Stock
            await updateStock(connection, {
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
             SET status = 'POSTED', posted_by = ?, posted_at = NOW() 
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

// -----------------------------------------------------------------------------
// Stock Opname (Stock Count Sessions)
// -----------------------------------------------------------------------------

interface StockOpnameSessionRow extends RowDataPacket {
    id: number;
    session_no: string;
    opname_date: string;
    status: string;
    location: string | null;
    memo: string | null;
}

interface StockOpnameItemRow extends RowDataPacket {
    id: number;
    session_id: number;
    item_id: number;
    sku: string;
    item_name: string;
    system_qty: number;
    counted_qty: number | null;
    variance: number;
    notes: string | null;
}

export interface CreateStockOpnameInput {
    opnameDate: string;
    location?: string;
    memo?: string;
    itemIds: number[]; // Items to include in the count
}

export async function getStockOpnameSessions(params: {
    status?: string;
    page?: number;
    limit?: number;
}): Promise<{ sessions: import('../../shared/types').StockOpnameSession[]; total: number }> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.status) {
        conditions.push('so.status = ?');
        values.push(params.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM stock_opname_sessions so ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get sessions
    const rows = await query<StockOpnameSessionRow[]>(
        `SELECT so.* FROM stock_opname_sessions so
         ${whereClause}
         ORDER BY so.opname_date DESC, so.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    const sessions = rows.map(r => ({
        id: r.id,
        sessionNo: r.session_no,
        opnameDate: r.opname_date,
        status: r.status as import('../../shared/types').StockOpnameSession['status'],
        location: r.location || undefined,
        memo: r.memo || undefined,
        items: [],
    }));

    return { sessions, total };
}

export async function getStockOpnameSession(id: number): Promise<import('../../shared/types').StockOpnameSession | null> {
    const rows = await query<StockOpnameSessionRow[]>(
        'SELECT * FROM stock_opname_sessions WHERE id = ?',
        [id]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Get items
    const itemRows = await query<StockOpnameItemRow[]>(
        `SELECT soi.*, i.sku, i.name as item_name
         FROM stock_opname_items soi
         INNER JOIN items i ON i.id = soi.item_id
         WHERE soi.session_id = ?
         ORDER BY i.sku`,
        [id]
    );

    const items = itemRows.map(i => ({
        itemId: i.item_id,
        itemSku: i.sku,
        itemName: i.item_name,
        systemQty: Number(i.system_qty),
        countedQty: i.counted_qty != null ? Number(i.counted_qty) : undefined,
        variance: Number(i.variance),
        notes: i.notes || undefined,
    }));

    return {
        id: r.id,
        sessionNo: r.session_no,
        opnameDate: r.opname_date,
        status: r.status as import('../../shared/types').StockOpnameSession['status'],
        location: r.location || undefined,
        memo: r.memo || undefined,
        items,
    };
}

/**
 * Creates a new stock opname session and records the current system quantities for the provided item IDs.
 *
 * @param input - Session data including `opnameDate`, optional `location` and `memo`, and `itemIds` to include in the session
 * @param userId - ID of the user who creates the session
 * @returns The ID of the newly created stock opname session
 */
export async function createStockOpnameSession(
    input: CreateStockOpnameInput,
    userId: number
): Promise<number> {
    return transaction(async (connection) => {
        // Generate session number
        const sessionNo = await getNextNumber(connection, SequenceKeys.OPNAME);

        // Insert session header
        const result = await executeTx(
            connection,
            `INSERT INTO stock_opname_sessions 
             (session_no, opname_date, status, location, memo, created_by)
             VALUES (?, ?, 'OPEN', ?, ?, ?)`,
            [sessionNo, input.opnameDate, input.location || null, input.memo || null, userId]
        );

        const sessionId = result.insertId;

        // Get current stock for all items
        if (input.itemIds.length > 0) {
            const stockRows = await queryTx<ItemStockRow[]>(
                connection,
                `SELECT ist.item_id, ist.on_hand
                 FROM item_stock ist
                 WHERE ist.item_id IN (${input.itemIds.map(() => '?').join(',')})`,
                input.itemIds
            );

            const stockMap = new Map<number, number>();
            for (const row of stockRows) stockMap.set(row.item_id, Number(row.on_hand));

            // Bulk Insert Opname Items
            const itemValues: (string | number | null)[] = [];
            const placeholders = input.itemIds.map(itemId => {
                const systemQty = stockMap.get(itemId) || 0;
                itemValues.push(sessionId, itemId, systemQty);
                return '(?, ?, ?, NULL, 0, NULL)';
            }).join(', ');

            await executeTx(
                connection,
                `INSERT INTO stock_opname_items 
                 (session_id, item_id, system_qty, counted_qty, variance, notes)
                 VALUES ${placeholders}`,
                itemValues
            );
        }

        // Audit log
        await createAuditLogTx(connection, {
            action: 'CREATE',
            entityType: 'STOCK_OPNAME',
            entityId: sessionId,
            actorUserId: userId,
            metadata: { sessionNo, itemCount: input.itemIds.length },
        });

        return sessionId;
    });
}

export async function updateOpnameItem(
    sessionId: number,
    itemId: number,
    countedQty: number,
    notes?: string
): Promise<void> {
    // Get system qty to calculate variance
    const rows = await query<StockOpnameItemRow[]>(
        `SELECT * FROM stock_opname_items WHERE session_id = ? AND item_id = ?`,
        [sessionId, itemId]
    );

    if (rows.length === 0) {
        throw new InventoryError(
            ErrorCodes.RESOURCE_NOT_FOUND,
            'Item not found in opname session',
            404
        );
    }

    const systemQty = Number(rows[0].system_qty);
    const variance = countedQty - systemQty;

    await query(
        `UPDATE stock_opname_items 
         SET counted_qty = ?, variance = ?, notes = ?, updated_at = NOW()
         WHERE session_id = ? AND item_id = ?`,
        [countedQty, variance, notes || null, sessionId, itemId]
    );
}

export async function submitStockOpname(sessionId: number, userId: number): Promise<void> {
    // Check all items have been counted
    const uncounted = await query<RowDataPacket[]>(
        'SELECT COUNT(*) as cnt FROM stock_opname_items WHERE session_id = ? AND counted_qty IS NULL',
        [sessionId]
    );

    if (Number(uncounted[0]?.cnt) > 0) {
        throw new InventoryError(
            ErrorCodes.INV_OPNAME_INVALID_STATUS,
            'All items must be counted before submitting',
            400
        );
    }

    await query(
        `UPDATE stock_opname_sessions SET status = 'SUBMITTED', updated_at = NOW() WHERE id = ?`,
        [sessionId]
    );

    await createAuditLogTx(null as unknown as PoolConnection, {
        action: 'UPDATE',
        entityType: 'STOCK_OPNAME',
        entityId: sessionId,
        actorUserId: userId,
        metadata: { status: 'SUBMITTED' },
    });
}

export async function postStockOpname(
    sessionId: number,
    userId: number,
    idempotencyKey: string
): Promise<number> {
    return transaction(async (connection) => {
        // Check idempotency
        const existingKey = await queryTx<RowDataPacket[]>(
            connection,
            'SELECT id FROM idempotency_keys WHERE key_value = ?',
            [idempotencyKey]
        );

        if (existingKey.length > 0) {
            return 0;
        }

        // Lock and get session
        const sessionRows = await queryTx<StockOpnameSessionRow[]>(
            connection,
            'SELECT * FROM stock_opname_sessions WHERE id = ? FOR UPDATE',
            [sessionId]
        );

        if (sessionRows.length === 0) {
            throw new InventoryError(ErrorCodes.RESOURCE_NOT_FOUND, 'Session not found', 404);
        }

        const session = sessionRows[0];

        if (session.status !== 'SUBMITTED') {
            throw new InventoryError(
                ErrorCodes.INV_OPNAME_INVALID_STATUS,
                'Session must be submitted before posting',
                400
            );
        }

        // Get items with variance
        const items = await queryTx<StockOpnameItemRow[]>(
            connection,
            `SELECT soi.*, i.sku, i.name as item_name
             FROM stock_opname_items soi
             INNER JOIN items i ON i.id = soi.item_id
             WHERE soi.session_id = ? AND soi.variance != 0`,
            [sessionId]
        );

        if (items.length === 0) {
            // No adjustments needed, just mark as posted
            await executeTx(
                connection,
                `UPDATE stock_opname_sessions SET status = 'POSTED', posted_at = NOW(), posted_by = ? WHERE id = ?`,
                [userId, sessionId]
            );
            return 0;
        }

        // Create adjustment for variances
        const adjNo = await getNextNumber(connection, SequenceKeys.ADJUSTMENT);

        const adjResult = await executeTx(
            connection,
            `INSERT INTO inventory_adjustments 
             (adjustment_no, adj_date, status, adjustment_type, memo, created_by)
             VALUES (?, ?, 'DRAFT', 'OPNAME', ?, ?)`,
            [adjNo, session.opname_date, `Stock Opname ${session.session_no}`, userId]
        );

        const adjId = adjResult.insertId;

        // Insert adjustment lines and process stock updates
        let lineNo = 1;
        for (const item of items) {
            const variance = Number(item.variance);
            const reasonCode = variance < 0 ? 'LOST' : 'FOUND';

            // Get current avg cost
            const [itemRow] = await queryTx<RowDataPacket[]>(
                connection,
                'SELECT avg_cost FROM items WHERE id = ?',
                [item.item_id]
            );
            const unitCost = Number(itemRow?.avg_cost || 0);

            await executeTx(
                connection,
                `INSERT INTO inventory_adjustment_lines
                 (adjustment_id, line_no, item_id, qty_delta, unit_cost, reason_code, memo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [adjId, lineNo++, item.item_id, variance, unitCost, reasonCode, item.notes || null]
            );

            // Update stock
            await updateStock(connection, {
                itemId: item.item_id,
                qtyDelta: variance,
                unitCost,
                sourceType: 'OPNAME',
                sourceId: sessionId,
                memo: `Opname: ${session.session_no}`,
            }, false);
        }

        // Mark adjustment as posted
        await executeTx(
            connection,
            `UPDATE inventory_adjustments 
             SET status = 'POSTED', posted_by = ?, posted_at = NOW() 
             WHERE id = ?`,
            [userId, adjId]
        );

        // Mark session as posted
        await executeTx(
            connection,
            `UPDATE stock_opname_sessions 
             SET status = 'POSTED', adjustment_id = ?, posted_at = NOW(), posted_by = ? 
             WHERE id = ?`,
            [adjId, userId, sessionId]
        );

        // Store idempotency key
        await executeTx(
            connection,
            `INSERT INTO idempotency_keys (key_value, entity_type, entity_id, expires_at)
             VALUES (?, 'STOCK_OPNAME', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [idempotencyKey, sessionId]
        );

        // Audit log
        await createAuditLogTx(connection, {
            action: 'POST',
            entityType: 'STOCK_OPNAME',
            entityId: sessionId,
            actorUserId: userId,
            metadata: { sessionNo: session.session_no, adjustmentId: adjId },
        });

        return adjId;
    });
}
