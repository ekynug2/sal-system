'use client';

// =============================================================================
// SAL Accounting System - Auth Provider
// =============================================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../../../../../packages/shared/types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provides authentication state and actions to descendant components via AuthContext.
 *
 * Exposes the current `user`, `isLoading` flag, and the `login`, `logout`, and `hasPermission` helpers to any child component that consumes the context.
 *
 * @param children - React nodes to render inside the provider
 * @returns The AuthContext provider element wrapping `children`
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check auth status on mount
        fetchUser();
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUser(data.data);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(email: string, password: string) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error?.message || 'Login gagal');
        }

        const data = await res.json();
        setUser(data.data.user);
        router.push('/dashboard');
    }

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        router.push('/login');
    }

    function hasPermission(permission: string): boolean {
        return user?.permissions.includes(permission) ?? false;
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}