'use client';

// =============================================================================
// SAL Accounting System - Login Page
// =============================================================================

import { useState } from 'react';
import { useAuth } from '@/ui/providers/auth-provider';
import { CreditCard, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Render the SAL Accounting login page with an email/password form, password visibility toggle, and demo credentials.
 *
 * Handles user input and submission via the authentication provider; on success or failure it displays localized toast notifications and shows an inline accessible error message when present.
 *
 * @returns A JSX element representing the login page UI.
 */
export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            toast.success('Selamat datang kembali!', {
                description: 'Anda berhasil masuk.',
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Gagal Masuk. Silakan coba lagi.';
            setError(errorMessage);
            toast.error('Gagal Masuk', {
                description: errorMessage,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--gray-900) 0%, var(--primary-900) 50%, var(--gray-800) 100%)',
                padding: 'var(--space-4)',
            }}
        >
            <div
                className="card animate-slide-up"
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: 'var(--space-8)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--radius-xl)',
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--space-4)',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <CreditCard size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
                        SAL Accounting
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Masuk ke akun Anda
                    </p>
                </div>

                {error && (
                    <div
                        id="login-error"
                        role="alert"
                        aria-live="polite"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3) var(--space-4)',
                            background: 'var(--accent-red-light)',
                            color: '#991b1b',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)',
                            fontSize: '0.875rem',
                        }}
                    >
                        <AlertCircle size={18} aria-hidden="true" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Alamat Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                                aria-hidden="true"
                            />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@sal-system.local"
                                required
                                autoComplete="email"
                                aria-label="Alamat Email"
                                aria-invalid={!!error}
                                aria-describedby={error ? "login-error" : undefined}
                                style={{ paddingLeft: '42px' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Kata Sandi</label>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                                aria-hidden="true"
                            />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                aria-label="Kata Sandi"
                                aria-invalid={!!error}
                                aria-describedby={error ? "login-error" : undefined}
                                style={{ paddingLeft: '42px', paddingRight: '42px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                aria-pressed={showPassword}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || isLoading}
                        style={{ width: '100%', marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}
                    >
                        {isSubmitting ? 'Sedang Masuk...' : 'Masuk'}
                    </button>
                </form>

                <div
                    style={{
                        marginTop: 'var(--space-6)',
                        padding: 'var(--space-4)',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <strong>Kredensial Demo:</strong>
                    <br />
                    Email: admin@sal-system.local
                    <br />
                    Password: admin123
                </div>
            </div>
        </div>
    );
}