// =============================================================================
// SAL Accounting System - Environment Configuration
// =============================================================================

// Database
export const DB_HOST = process.env.MYSQL_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.MYSQL_PORT || '3306');
export const DB_USER = process.env.MYSQL_USER || 'sal_user';
export const DB_PASSWORD = process.env.MYSQL_PASSWORD || 'sal_password';
export const DB_NAME = process.env.MYSQL_DATABASE || 'sal_accounting';

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'sal-accounting-secret-key-change-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// App
export const APP_ENV = process.env.NODE_ENV || 'development';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
