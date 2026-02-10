'use client';

// =============================================================================
// SAL Accounting System - Chart of Accounts Page
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/providers/auth-provider';
import { Sidebar } from '@/ui/components/sidebar';
import { useChartOfAccounts, useCreateAccount } from '@/hooks/use-accounting';
import type { ChartOfAccount } from '@/shared/types';
import {
    Search,
    Plus,
    ChevronRight,
    ChevronDown,
    Loader2,
    BookOpen,
    FolderOpen,
    FileText,
    X,
    Save,
} from 'lucide-react';
import { Permissions } from '@/shared/constants';

// Account type badges
const typeColors: Record<string, string> = {
    ASSET: 'badge-info',
    LIABILITY: 'badge-warning',
    EQUITY: 'badge-secondary',
    REVENUE: 'badge-success',
    EXPENSE: 'badge-danger',
    COGS: 'badge-danger',
};

const typeLabels: Record<string, string> = {
    ASSET: 'Aset',
    LIABILITY: 'Kewajiban',
    EQUITY: 'Ekuitas',
    REVENUE: 'Pendapatan',
    EXPENSE: 'Beban',
    COGS: 'HPP',
};

/**
 * Renders the Chart of Accounts page with search, hierarchical tree view, and account creation UI.
 *
 * Displays an authentication loading state, redirects unauthenticated users to the login page, and fetches accounts either as a flat list when searching or as a tree for normal view. Provides controls to expand/collapse the tree, a permission-guarded "Akun Baru" button to open the create-account modal, and UI states for loading and empty results.
 *
 * @returns The page's React element containing the chart of accounts layout and associated interactive controls.
 */
export default function ChartOfAccountsPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();
    const [search, setSearch] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [showModal, setShowModal] = useState(false);

    // Fetch flat for search, tree for normal view
    const { data: accounts, isLoading, refetch } = useChartOfAccounts({
        flat: search.length > 0,
        search: search || undefined,
    });

    if (authLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (accounts) {
            const allIds = new Set<number>();
            const collectIds = (accs: ChartOfAccount[]) => {
                for (const acc of accs) {
                    if (acc.children && acc.children.length > 0) {
                        allIds.add(acc.id);
                        collectIds(acc.children);
                    }
                }
            };
            collectIds(accounts);
            setExpandedIds(allIds);
        }
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Daftar Akun</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            Kelola struktur akun Anda
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {hasPermission(Permissions.COA_CREATE) && (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                <Plus size={18} />
                                Akun Baru
                            </button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Cari akun..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 42, width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button className="btn btn-secondary btn-sm" onClick={expandAll}>
                                <ChevronDown size={16} /> Buka Semua
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={collapseAll}>
                                <ChevronRight size={16} /> Tutup Semua
                            </button>
                        </div>
                    </div>
                </div>

                {/* Accounts Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {isLoading ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}>
                                Memuat akun...
                            </p>
                        </div>
                    ) : !accounts || accounts.length === 0 ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                            <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Tidak ada akun ditemukan</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 140 }}>Kode</th>
                                    <th>Nama Akun</th>
                                    <th style={{ width: 120 }}>Tipe</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Header</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {search.length > 0 ? (
                                    // Flat view for search
                                    accounts.map(account => (
                                        <AccountRow key={account.id} account={account} level={0} expanded={false} onToggle={() => { }} />
                                    ))
                                ) : (
                                    // Tree view
                                    accounts.map(account => (
                                        <AccountTree
                                            key={account.id}
                                            account={account}
                                            level={0}
                                            expandedIds={expandedIds}
                                            onToggle={toggleExpand}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create Modal */}
                {showModal && (
                    <CreateAccountModal
                        accounts={accounts || []}
                        onClose={() => setShowModal(false)}
                        onSuccess={() => {
                            setShowModal(false);
                            refetch();
                        }}
                    />
                )}
            </main>
        </div>
    );
}

// Account Tree Component (recursive)
function AccountTree({
    account,
    level,
    expandedIds,
    onToggle,
}: {
    account: ChartOfAccount;
    level: number;
    expandedIds: Set<number>;
    onToggle: (id: number) => void;
}) {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedIds.has(account.id);

    return (
        <>
            <AccountRow
                account={account}
                level={level}
                expanded={isExpanded}
                hasChildren={hasChildren}
                onToggle={() => onToggle(account.id)}
            />
            {hasChildren && isExpanded && account.children!.map(child => (
                <AccountTree
                    key={child.id}
                    account={child}
                    level={level + 1}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                />
            ))}
        </>
    );
}

/**
 * Render a table row for a chart-of-account entry with indentation, icons, badges, and expand/collapse control.
 *
 * Renders account code, name (with header/file icon), account type badge, header indicator, and active status badge.
 *
 * @param account - The chart of account object to display
 * @param level - Nesting level used to indent the row and apply a subtle background tint
 * @param expanded - Whether the node is currently expanded (affects the chevron icon)
 * @param hasChildren - Whether the account has child nodes (controls display of the expand/collapse control)
 * @param onToggle - Callback invoked when the expand/collapse control is clicked
 * @returns A JSX element representing the account's table row
 */
function AccountRow({
    account,
    level,
    expanded,
    hasChildren,
    onToggle,
}: {
    account: ChartOfAccount;
    level: number;
    expanded: boolean;
    hasChildren?: boolean;
    onToggle: () => void;
}) {
    return (
        <tr style={{ background: level > 0 ? `rgba(var(--primary-rgb), ${0.02 * level})` : undefined }}>
            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: account.isHeader ? 600 : 400 }}>
                {account.accountCode}
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: level * 24 }}>
                    {hasChildren ? (
                        <button
                            onClick={onToggle}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: 4,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                marginRight: 4,
                            }}
                        >
                            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    ) : (
                        <span style={{ width: 24 }} />
                    )}
                    {account.isHeader ? (
                        <FolderOpen size={16} style={{ marginRight: 8, color: 'var(--primary-500)' }} />
                    ) : (
                        <FileText size={16} style={{ marginRight: 8, color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontWeight: account.isHeader ? 600 : 400 }}>
                        {account.accountName}
                    </span>
                </div>
            </td>
            <td>
                <span className={`badge ${typeColors[account.accountTypeCode] || 'badge-secondary'}`}>
                    {typeLabels[account.accountTypeCode] || account.accountTypeCode}
                </span>
            </td>
            <td style={{ textAlign: 'center' }}>
                {account.isHeader && (
                    <span style={{ color: 'var(--primary-500)', fontWeight: 500 }}>✓</span>
                )}
            </td>
            <td style={{ textAlign: 'center' }}>
                <span className={`badge ${account.isActive ? 'badge-success' : 'badge-secondary'}`}>
                    {account.isActive ? 'Aktif' : 'Tidak Aktif'}
                </span>
            </td>
        </tr>
    );
}

/**
 * Renders a modal form for creating a new chart-of-account entry.
 *
 * Renders form fields for code, name, account type, optional parent (populated from `accounts`), header flag, and description; submits data via the create-account hook and invokes callbacks on close or successful creation.
 *
 * @param accounts - Hierarchical list of existing accounts used to populate the "parent account" dropdown (flattened internally).
 * @param onClose - Callback invoked when the modal is dismissed without creating an account.
 * @param onSuccess - Callback invoked after an account is successfully created.
 * @returns The modal JSX for creating a new account.
 */
function CreateAccountModal({
    accounts,
    onClose,
    onSuccess,
}: {
    accounts: ChartOfAccount[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const createAccount = useCreateAccount();
    const [formData, setFormData] = useState({
        accountCode: '',
        accountName: '',
        accountTypeCode: 'ASSET',
        parentId: '',
        isHeader: false,
        description: '',
    });

    // Flatten accounts for parent dropdown
    const flatAccounts: ChartOfAccount[] = [];
    const flatten = (accs: ChartOfAccount[]) => {
        for (const acc of accs) {
            flatAccounts.push(acc);
            if (acc.children) flatten(acc.children);
        }
    };
    flatten(accounts);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAccount.mutateAsync({
                accountCode: formData.accountCode,
                accountName: formData.accountName,
                accountTypeCode: formData.accountTypeCode,
                parentId: formData.parentId ? Number(formData.parentId) : undefined,
                isHeader: formData.isHeader,
                description: formData.description || undefined,
            });
            onSuccess();
        } catch (err) {
            alert(`Gagal: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2>Buat Akun Baru</h2>
                    <button className="btn btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div>
                            <label className="label">Kode Akun *</label>
                            <input
                                type="text"
                                required
                                value={formData.accountCode}
                                onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
                                placeholder="cth. 1-1100"
                            />
                        </div>
                        <div>
                            <label className="label">Nama Akun *</label>
                            <input
                                type="text"
                                required
                                value={formData.accountName}
                                onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                placeholder="cth. Kas di Bank"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div>
                                <label className="label">Tipe Akun *</label>
                                <select
                                    required
                                    value={formData.accountTypeCode}
                                    onChange={e => setFormData({ ...formData, accountTypeCode: e.target.value })}
                                >
                                    <option value="ASSET">Aset</option>
                                    <option value="LIABILITY">Kewajiban</option>
                                    <option value="EQUITY">Ekuitas</option>
                                    <option value="REVENUE">Pendapatan</option>
                                    <option value="EXPENSE">Beban</option>
                                    <option value="COGS">HPP</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Akun Induk</label>
                                <select
                                    value={formData.parentId}
                                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                                >
                                    <option value="">Tidak Ada (Level Teratas)</option>
                                    {flatAccounts.filter(a => a.isHeader).map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.accountCode} - {a.accountName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isHeader}
                                    onChange={e => setFormData({ ...formData, isHeader: e.target.checked })}
                                />
                                Ini adalah akun header (grup)
                            </label>
                        </div>
                        <div>
                            <label className="label">Deskripsi</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                placeholder="Deskripsi opsional..."
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn btn-primary" disabled={createAccount.isPending}>
                            {createAccount.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Buat Akun
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}