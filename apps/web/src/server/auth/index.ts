// =============================================================================
// SAL Accounting System - Auth Service
// =============================================================================

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';
import { query, execute } from '../db';
import { ErrorCodes } from '../../shared/constants';
import type { User, Role } from '../../shared/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'sal-accounting-secret-key-change-in-production');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

interface UserRow extends RowDataPacket {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    is_active: number;
    last_login_at: string | null;
}

interface RoleRow extends RowDataPacket {
    id: number;
    code: string;
    name: string;
    description: string | null;
}

interface PermissionRow extends RowDataPacket {
    perm_code: string;
}

export interface AuthUser extends User {
    passwordHash?: string;
}

export interface JWTPayload {
    userId: number;
    email: string;
    iat?: number;
    exp?: number;
}

export class AuthError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 401
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<AuthUser | null> {
    const rows = await query<UserRow[]>(
        'SELECT id, email, password_hash, full_name, is_active, last_login_at FROM users WHERE email = ?',
        [email]
    );

    if (rows.length === 0) {
        return null;
    }

    const user = rows[0];
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isActive: Boolean(user.is_active),
        lastLoginAt: user.last_login_at || undefined,
        roles,
        permissions,
        passwordHash: user.password_hash,
    };
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<AuthUser | null> {
    const rows = await query<UserRow[]>(
        'SELECT id, email, password_hash, full_name, is_active, last_login_at FROM users WHERE id = ?',
        [id]
    );

    if (rows.length === 0) {
        return null;
    }

    const user = rows[0];
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isActive: Boolean(user.is_active),
        lastLoginAt: user.last_login_at || undefined,
        roles,
        permissions,
    };
}

/**
 * Get user roles
 */
async function getUserRoles(userId: number): Promise<Role[]> {
    const rows = await query<RoleRow[]>(
        `SELECT r.id, r.code, r.name, r.description
     FROM roles r
     INNER JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
        [userId]
    );

    return rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description || undefined,
    }));
}

/**
 * Get user permissions (from all roles)
 */
async function getUserPermissions(userId: number): Promise<string[]> {
    const rows = await query<PermissionRow[]>(
        `SELECT DISTINCT rp.perm_code
     FROM role_permissions rp
     INNER JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?`,
        [userId]
    );

    return rows.map(r => r.perm_code);
}

/**
 * Verify password
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<{ user: User; token: string; expiresAt: string }> {
    const user = await findUserByEmail(email);

    if (!user) {
        throw new AuthError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new AuthError(ErrorCodes.AUTH_USER_INACTIVE, 'User account is inactive', 403);
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash!);
    if (!isPasswordValid) {
        throw new AuthError(ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Update last login
    await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Generate token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const token = await generateToken({ userId: user.id, email: user.email });

    // Remove passwordHash from returned user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;

    return {
        user: safeUser,
        token,
        expiresAt: expiresAt.toISOString(),
    };
}

/**
 * Generate JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as JWTPayload;
    } catch {
        throw new AuthError(ErrorCodes.AUTH_TOKEN_EXPIRED, 'Token is invalid or expired');
    }
}

/**
 * Check if user has permission
 */
export function hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some(p => user.permissions.includes(p));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(user: User, permissions: string[]): boolean {
    return permissions.every(p => user.permissions.includes(p));
}

/**
 * Require permission - throws if user doesn't have it
 */
export function requirePermission(user: User, permission: string): void {
    if (!hasPermission(user, permission)) {
        throw new AuthError(
            ErrorCodes.AUTH_FORBIDDEN,
            `Permission denied: ${permission} required`,
            403
        );
    }
}
