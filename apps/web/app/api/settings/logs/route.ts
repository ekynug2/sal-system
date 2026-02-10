import { NextRequest } from 'next/server';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { getAuditLogs } from '@/server/services/audit.service';
import { AuditLog } from '@/shared/types';

export const dynamic = 'force-dynamic';

/**
 * Handle GET requests for audit logs, enforcing SETTINGS_VIEW permission and supporting pagination and filters.
 *
 * The endpoint accepts query parameters: `page`, `limit`, `entityType`, `action`, `from`, and `to`.
 * Response `data` contains audit logs with camelCase fields (including `actorName` from a joined field).
 *
 * @returns An object with `data` (array of `AuditLog`) and `meta` containing pagination info: `page`, `limit`, `total`, and `totalPages`.
 */
export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        // Assuming SETTINGS_VIEW permission is enough to view logs
        requirePermission(user, 'SETTINGS_VIEW');

        const searchParams = request.nextUrl.searchParams;
        const page = Number(searchParams.get('page')) || 1;
        const limit = Number(searchParams.get('limit')) || 20;
        const entityType = searchParams.get('entityType') || undefined;
        const action = searchParams.get('action') || undefined;
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;

        const { logs, total } = await getAuditLogs({
            page,
            limit,
            entityType,
            action,
            from,
            to,
        });

        // Transform snake_case to camelCase
        const mappedLogs: AuditLog[] = logs.map(log => ({
            id: log.id,
            actorUserId: log.actor_user_id,
            actorName: (log as any).actor_name, // Joined field
            action: log.action,
            entityType: log.entity_type,
            entityId: log.entity_id,
            occurredAt: log.occurred_at,
            beforeJson: log.before_json || undefined,
            afterJson: log.after_json || undefined,
            metaJson: log.meta_json || undefined,
            ipAddress: log.ip_address || undefined,
            userAgent: log.user_agent || undefined,
        }));

        return successResponse({
            data: mappedLogs,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}