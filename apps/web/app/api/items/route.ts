// =============================================================================
// SAL Accounting System - Items API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { query, transaction, executeTx } from '@/server/db';
import { RowDataPacket } from 'mysql2';
import { CreateItemInput } from '@/shared/schemas';

interface ItemRow extends RowDataPacket {
    id: number;
    sku: string;
    barcode: string | null;
    name: string;
    description: string | null;
    category_id: number | null;
    category_name: string | null;
    uom_id: number;
    uom_code: string;
    avg_cost: number;
    selling_price: number;
    min_stock: number;
    tax_code: string;
    is_active: boolean;
    is_sellable: boolean;
    is_purchasable: boolean;
    on_hand: number | null;
}

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.ITEM_VIEW);

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const sellableOnly = searchParams.get('sellableOnly') === 'true';
        const purchasableOnly = searchParams.get('purchasableOnly') === 'true';

        let sql = `
            SELECT i.*, 
                   ic.name as category_name,
                   u.code as uom_code,
                   ist.on_hand
            FROM items i
            LEFT JOIN item_categories ic ON ic.id = i.category_id
            LEFT JOIN units_of_measure u ON u.id = i.uom_id
            LEFT JOIN item_stock ist ON ist.item_id = i.id
            WHERE i.is_active = 1
        `;
        const params: (string | number)[] = [];

        if (sellableOnly) {
            sql += ' AND i.is_sellable = 1';
        }

        if (purchasableOnly) {
            sql += ' AND i.is_purchasable = 1';
        }

        if (search) {
            sql += ' AND (i.sku LIKE ? OR i.name LIKE ? OR i.barcode LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        sql += ' ORDER BY i.name LIMIT 100';

        const rows = await query<ItemRow[]>(sql, params);

        const items = rows.map(r => ({
            id: r.id,
            sku: r.sku,
            barcode: r.barcode || undefined,
            name: r.name,
            description: r.description || undefined,
            categoryId: r.category_id || undefined,
            categoryName: r.category_name || undefined,
            uomId: r.uom_id,
            uomCode: r.uom_code,
            avgCost: Number(r.avg_cost),
            sellingPrice: Number(r.selling_price),
            minStock: r.min_stock,
            taxCode: r.tax_code,
            isActive: Boolean(r.is_active),
            isSellable: Boolean(r.is_sellable),
            isPurchasable: Boolean(r.is_purchasable),
            onHand: r.on_hand ? Number(r.on_hand) : 0,
        }));

        return successResponse(items);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.ITEM_CREATE);

        const body = await request.json();
        const parsed = CreateItemInput.parse(body);

        const itemId = await transaction(async (connection) => {
            const result = await executeTx(
                connection,
                `INSERT INTO items (
                    sku, barcode, name, description, category_id, uom_id,
                    selling_price, min_stock, max_stock, tax_code,
                    is_active, is_sellable, is_purchasable, track_inventory
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
                [
                    parsed.sku,
                    parsed.barcode || null,
                    parsed.name,
                    parsed.description || null,
                    parsed.categoryId || null,
                    parsed.uomId,
                    parsed.sellingPrice,
                    parsed.minStock,
                    parsed.maxStock || null,
                    parsed.taxCode,
                    parsed.isSellable ? 1 : 0,
                    parsed.isPurchasable ? 1 : 0,
                    parsed.trackInventory ? 1 : 0
                ]
            );
            return result.insertId;
        });

        return successResponse({ id: itemId }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}
