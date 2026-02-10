'use client';

// =============================================================================
// SAL Accounting System - Export/Print Toolbar Component
// =============================================================================

import { useState, useRef } from 'react';
import { Printer, Download, Upload, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

interface ExportPrintToolbarProps {
    onPrint?: () => void;
    onExportExcel?: () => void;
    onExportCSV?: () => void;
    onImport?: (file: File) => void;
    onDownloadTemplate?: () => void;
    showPrint?: boolean;
    showExport?: boolean;
    showImport?: boolean;
    printLabel?: string;
    exportLabel?: string;
    importLabel?: string;
}

export function ExportPrintToolbar({
    onPrint,
    onExportExcel,
    onExportCSV,
    onImport,
    onDownloadTemplate,
    showPrint = true,
    showExport = true,
    showImport = false,
    printLabel = 'Cetak',
    exportLabel = 'Ekspor',
    importLabel = 'Impor',
}: ExportPrintToolbarProps) {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showImportMenu, setShowImportMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImport) {
            onImport(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setShowImportMenu(false);
    };

    return (
        <div className="export-print-toolbar" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {/* Print Button */}
            {showPrint && onPrint && (
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onPrint}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                    <Printer size={16} />
                    {printLabel}
                </button>
            )}

            {/* Export Dropdown */}
            {showExport && (onExportExcel || onExportCSV) && (
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                        <Download size={16} />
                        {exportLabel}
                        <ChevronDown size={14} />
                    </button>

                    {showExportMenu && (
                        <>
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 40,
                                }}
                                onClick={() => setShowExportMenu(false)}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: 4,
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 50,
                                    minWidth: 160,
                                    overflow: 'hidden',
                                }}
                            >
                                {onExportExcel && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onExportExcel();
                                            setShowExportMenu(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            width: '100%',
                                            padding: 'var(--space-2) var(--space-3)',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.875rem',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: 'var(--accent-green)' }} />
                                        Ekspor ke Excel
                                    </button>
                                )}
                                {onExportCSV && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onExportCSV();
                                            setShowExportMenu(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            width: '100%',
                                            padding: 'var(--space-2) var(--space-3)',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.875rem',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <FileText size={16} style={{ color: 'var(--accent-blue)' }} />
                                        Ekspor ke CSV
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Import Dropdown */}
            {showImport && (onImport || onDownloadTemplate) && (
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowImportMenu(!showImportMenu)}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                        <Upload size={16} />
                        {importLabel}
                        <ChevronDown size={14} />
                    </button>

                    {showImportMenu && (
                        <>
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 40,
                                }}
                                onClick={() => setShowImportMenu(false)}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: 4,
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 50,
                                    minWidth: 180,
                                    overflow: 'hidden',
                                }}
                            >
                                {onDownloadTemplate && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onDownloadTemplate();
                                            setShowImportMenu(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            width: '100%',
                                            padding: 'var(--space-2) var(--space-3)',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '0.875rem',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Download size={16} />
                                        Unduh Template
                                    </button>
                                )}
                                {onImport && (
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            width: '100%',
                                            padding: 'var(--space-2) var(--space-3)',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Upload size={16} style={{ color: 'var(--accent-green)' }} />
                                        Impor dari Excel
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// Simple Print Button (standalone)
export function PrintButton({
    onClick,
    label = 'Cetak',
    size = 'md'
}: {
    onClick: () => void;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
        <button
            type="button"
            className={`btn btn-secondary btn-${size}`}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
            <Printer size={iconSize} />
            {label}
        </button>
    );
}

// Simple Export Button (standalone)
export function ExportButton({
    onClick,
    label = 'Ekspor',
    variant = 'excel',
    size = 'md'
}: {
    onClick: () => void;
    label?: string;
    variant?: 'excel' | 'csv';
    size?: 'sm' | 'md' | 'lg';
}) {
    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
    const Icon = variant === 'excel' ? FileSpreadsheet : FileText;

    return (
        <button
            type="button"
            className={`btn btn-secondary btn-${size}`}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
            <Icon size={iconSize} />
            {label}
        </button>
    );
}
