import { NextRequest } from 'next/server';
import { getAuthUser, requirePermission } from '@/lib/auth-middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { Permissions } from '@/shared/constants';
import { transaction, executeTx, queryTx } from '@/server/db';
import * as XLSX from 'xlsx';
import { RowDataPacket } from 'mysql2';

/**
 * Handles POST requests to bulk-import items from an uploaded Excel file.
 *
 * Processes the first worksheet of the uploaded file, validates and inserts each row as a new item inside a single database transaction, and aggregates import results.
 *
 * @returns An object with `success` boolean, a `message` summarizing counts of successful and failed imports, and an `errors` array (up to 100 entries) containing per-row failure details.
 */
export async function POST(request: NextRequest) {
    try {
        const { user } = await getAuthUser(request);
        requirePermission(user, Permissions.ITEM_CREATE);

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new Error('No file uploaded');
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
            throw new Error('Excel file is empty');
        }

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        await transaction(async (connection) => {
            for (const row of jsonData) {
                try {
                    // Map columns
                    const sku = row['SKU']?.toString().trim();
                    const name = row['Name']?.toString().trim();
                    const barcode = row['Barcode']?.toString().trim() || null;
                    const description = row['Description']?.toString().trim() || null;
                    const categoryId = parseInt(row['Category ID']) || null;
                    const uomId = parseInt(row['UOM ID']);
                    const sellingPrice = parseFloat(row['Selling Price']) || 0;
                    const minStock = parseFloat(row['Min Stock']) || 0;
                    const maxStock = parseFloat(row['Max Stock']) || null;
                    const taxCode = row['Tax Code']?.toString().trim().toUpperCase() || 'NON';
                    const isSellable = String(row['Sellable']).toLowerCase() === 'yes' ? 1 : 0;
                    const isPurchasable = String(row['Purchasable']).toLowerCase() === 'yes' ? 1 : 0;
                    const trackInventory = String(row['Track Stock']).toLowerCase() === 'yes' ? 1 : 0;

                    if (!sku || !name || !uomId) {
                        failCount++;
                        errors.push(`Row missing required fields (SKU, Name, UOM ID): ${JSON.stringify(row)}`);
                        continue;
                    }

                    // Check if SKU exists
                    const existing = await queryTx<RowDataPacket[]>(
                        connection,
                        'SELECT id FROM items WHERE sku = ?',
                        [sku]
                    );

                    if (existing.length > 0) {
                        failCount++;
                        errors.push(`SKU ${sku} already exists`);
                        continue;
                    }

                    await executeTx(
                        connection,
                        `INSERT INTO items (
                            sku, barcode, name, description, category_id, uom_id,
                            selling_price, min_stock, max_stock, tax_code,
                            is_active, is_sellable, is_purchasable, track_inventory
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
                        [
                            sku, barcode, name, description, categoryId, uomId,
                            sellingPrice, minStock, maxStock, taxCode,
                            isSellable, isPurchasable, trackInventory
                        ]
                    );

                    successCount++;
                } catch (err) {
                    failCount++;
                    errors.push(`Error processing row with SKU ${row['SKU']}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
        });

        return successResponse({
            success: true,
            message: `Import completed. Success: ${successCount}, Failed: ${failCount}`,
            errors: errors.slice(0, 100) // Limit error details
        });
    } catch (error) {
        return handleApiError(error);
    }
}