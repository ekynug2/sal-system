// =============================================================================
// SAL Accounting System - Audit Service
// =============================================================================

import { RowDataPacket } from 'mysql2';
import { execute, query } from '../db';
import { executeTx } from '../db';
import type { PoolConnection } from 'mysql2/promise';

export interface AuditLogEntry {
    actorUserId: number;
    action: string;
    entityType: string;
    entityId: number;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

interface AuditLogRow extends RowDataPacket {
    id: number;
    actor_user_id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    occurred_at: string;
    before_json: string | null;
    after_json: string | null;
    meta_json: string | null;
    ip_address: string | null;
    user_agent: string | null;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    await execute(
        `INSERT INTO audit_logs 
     (actor_user_id, action, entity_type, entity_id, before_json, after_json, meta_json, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            entry.actorUserId,
            entry.action,
            entry.entityType,
            entry.entityId,
            entry.beforeData ? JSON.stringify(entry.beforeData) : null,
            entry.afterData ? JSON.stringify(entry.afterData) : null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            entry.ipAddress || null,
            entry.userAgent || null,
        ]
    );
}

/**
 * Create audit log entry within transaction
 */
export async function createAuditLogTx(
    connection: PoolConnection,
    entry: AuditLogEntry
): Promise<void> {
    await executeTx(
        connection,
        `INSERT INTO audit_logs 
     (actor_user_id, action, entity_type, entity_id, before_json, after_json, meta_json, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            entry.actorUserId,
            entry.action,
            entry.entityType,
            entry.entityId,
            entry.beforeData ? JSON.stringify(entry.beforeData) : null,
            entry.afterData ? JSON.stringify(entry.afterData) : null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            entry.ipAddress || null,
            entry.userAgent || null,
        ]
    );
}

export interface AuditLogQuery {
    entityType?: string;
    entityId?: number;
    actorUserId?: number;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(params: AuditLogQuery): Promise<{
    logs: AuditLogRow[];
    total: number;
}> {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.entityType) {
        conditions.push('entity_type = ?');
        values.push(params.entityType);
    }

    if (params.entityId) {
        conditions.push('entity_id = ?');
        values.push(params.entityId);
    }

    if (params.actorUserId) {
        conditions.push('actor_user_id = ?');
        values.push(params.actorUserId);
    }

    if (params.action) {
        conditions.push('action = ?');
        values.push(params.action);
    }

    if (params.from) {
        conditions.push('occurred_at >= ?');
        values.push(params.from);
    }

    if (params.to) {
        conditions.push('occurred_at <= ?');
        values.push(params.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        values
    );
    const total = countResult?.total || 0;

    // Get logs
    const logs = await query<AuditLogRow[]>(
        `SELECT al.*, u.full_name as actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${whereClause}
     ORDER BY occurred_at DESC
     LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return { logs, total };
}
