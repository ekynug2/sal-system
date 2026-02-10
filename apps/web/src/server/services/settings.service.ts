
import { query, execute } from '../db';
import { RowDataPacket } from 'mysql2';
import { SettingsKeys } from '@/shared/constants';

export async function getSettings(keys?: string[]): Promise<Record<string, string>> {
    let sql = 'SELECT setting_key, setting_value FROM settings';
    const params: string[] = [];

    if (keys && keys.length > 0) {
        sql += ` WHERE setting_key IN (${keys.map(() => '?').join(',')})`;
        params.push(...keys);
    }

    const rows = await query<RowDataPacket[]>(sql, params);

    // Convert to object
    const settings: Record<string, string> = {};
    for (const row of rows) {
        settings[row.setting_key] = row.setting_value;
    }

    return settings;
}

export async function updateSettings(settings: Record<string, string>): Promise<void> {
    const values: (string)[] = [];
    const placeholders: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
        values.push(key, value);
        placeholders.push('(?, ?)');
    }

    if (values.length === 0) return;

    await execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES ${placeholders.join(', ')}
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        values
    );
}
