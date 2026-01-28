// =============================================================================
// SAL Accounting System - Journal Entries API
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, paginatedResponse, handleApiError } from '@/lib/api-response';
import { getJournalEntries, createJournalEntry, CreateJournalInput } from '@/server/services/journal.service';
import { transaction } from '@/server/db';
import { Permissions } from '@/shared/constants';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.JOURNAL_VIEW);

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from') || undefined;
        const to = searchParams.get('to') || undefined;
        const sourceType = searchParams.get('sourceType') || undefined;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const { entries, total } = await getJournalEntries({
            from,
            to,
            sourceType,
            page,
            limit,
        });

        return paginatedResponse(entries, total, page, limit);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.JOURNAL_MANUAL_CREATE);

        const body = await request.json();

        // Validation
        if (!body.entryDate) {
            throw new Error('Entry date is required');
        }

        if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
            throw new Error('At least two journal lines are required');
        }

        // Validate each line
        for (const line of body.lines) {
            if (!line.accountId || !line.dc || !line.amount) {
                throw new Error('Each line must have accountId, dc (D/C), and amount');
            }
            if (line.dc !== 'D' && line.dc !== 'C') {
                throw new Error('dc must be D or C');
            }
            if (line.amount <= 0) {
                throw new Error('Amount must be positive');
            }
        }

        const id = await transaction(async (connection) => {
            const input: CreateJournalInput = {
                entryDate: body.entryDate,
                sourceType: 'MANUAL',
                isManual: true,
                memo: body.memo,
                lines: body.lines.map((l: { accountId: number; dc: 'D' | 'C'; amount: number; memo?: string; entityType?: string; entityId?: number }) => ({
                    accountId: l.accountId,
                    dc: l.dc,
                    amount: l.amount,
                    memo: l.memo,
                    entityType: l.entityType,
                    entityId: l.entityId,
                })),
                postedBy: user.id,
            };

            return createJournalEntry(connection, input);
        });

        return successResponse({ id }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
