// =============================================================================
// SAL Accounting System - Database Connection
// =============================================================================

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER || 'sal_user',
            password: process.env.MYSQL_PASSWORD || 'sal_password',
            database: process.env.MYSQL_DATABASE || 'sal_accounting',
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            charset: 'utf8mb4',
        });
    }
    return pool;
}

export async function getConnection(): Promise<PoolConnection> {
    return getPool().getConnection();
}

// Execute query with automatic connection management
export async function query<T extends RowDataPacket[]>(
    sql: string,
    params?: (string | number | boolean | null | undefined)[]
): Promise<T> {
    const [rows] = await getPool().execute<T>(sql, params);
    return rows;
}

// Execute query that modifies data (INSERT, UPDATE, DELETE)
export async function execute(
    sql: string,
    params?: (string | number | boolean | null | undefined)[]
): Promise<ResultSetHeader> {
    const [result] = await getPool().execute<ResultSetHeader>(sql, params);
    return result;
}

// Transaction helper
export async function transaction<T>(
    callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Execute query within transaction
export async function queryTx<T extends RowDataPacket[]>(
    connection: PoolConnection,
    sql: string,
    params?: (string | number | boolean | null | undefined)[]
): Promise<T> {
    const [rows] = await connection.execute<T>(sql, params);
    return rows;
}

// Execute modification within transaction
export async function executeTx(
    connection: PoolConnection,
    sql: string,
    params?: (string | number | boolean | null | undefined)[]
): Promise<ResultSetHeader> {
    const [result] = await connection.execute<ResultSetHeader>(sql, params);
    return result;
}

// Health check
export async function checkHealth(): Promise<boolean> {
    try {
        await query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

// Close pool (for cleanup)
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
