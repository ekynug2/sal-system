import { createPool } from 'mysql2/promise';

const pool = createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'sal_user',
    password: process.env.MYSQL_PASSWORD || 'sal_password',
    database: process.env.MYSQL_DATABASE || 'sal_accounting',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

/**
 * Create the `settings` table if it does not exist and insert a set of default settings.
 *
 * On success the process exits with code 0; on failure the error is logged and the process exits with code 1.
 */
async function main() {
    try {
        console.log('Creating settings table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(255) NOT NULL UNIQUE,
                setting_value TEXT,
                description VARCHAR(255) NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_setting_key (setting_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('Settings table created or already exists.');

        console.log('Inserting default settings...');
        const defaults = [
            ['company_name', 'My Company'],
            ['default_currency', 'IDR'],
            ['format_sales_invoice', 'INV/{YEAR}/{SEQ}'],
            ['format_sales_payment', 'PAY/{YEAR}/{SEQ}'],
            ['format_purchase_bill', 'BILL/{YEAR}/{SEQ}'],
        ];

        for (const [key, value] of defaults) {
            await pool.execute(
                `INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)`,
                [key, value]
            );
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();