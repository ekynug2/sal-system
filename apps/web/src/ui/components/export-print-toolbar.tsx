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

/**
 * Renders a toolbar with optional Print, Export, and Import controls.
 *
 * The toolbar conditionally shows a Print button, an Export dropdown (Excel/CSV), and an Import dropdown
 * (download template and file import). Export and Import dropdowns close when an outside area is clicked.
 *
 * @param onPrint - Called when the Print button is clicked.
 * @param onExportExcel - Called when the "Export to Excel" item is selected.
 * @param onExportCSV - Called when the "Export to CSV" item is selected.
 * @param onImport - Called with the selected file when a file is chosen from the import input.
 * @param onDownloadTemplate - Called when the "Download Template" item is selected.
 * @param showPrint - Show the Print button when `true` (default: `true`).
 * @param showExport - Show the Export controls when `true` (default: `true`).
 * @param showImport - Show the Import controls when `true` (default: `false`).
 * @param printLabel - Label for the Print button (default: `"Cetak"`).
 * @param exportLabel - Label for the Export toggle (default: `"Ekspor"`).
 * @param importLabel - Label for the Import toggle (default: `"Impor"`).
 * @returns A React element displaying the configured export/print toolbar.
 */
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

/**
 * Renders a secondary-styled print button with a printer icon and label.
 *
 * @param onClick - Callback invoked when the button is pressed
 * @param label - Text displayed next to the icon (defaults to "Cetak")
 * @param size - Visual size of the button and icon; one of `"sm" | "md" | "lg"` (defaults to `"md"`)
 * @returns A button element containing a printer icon and the given label
 */
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

/**
 * Renders a secondary-styled export button that shows an icon (Excel or CSV) and a label.
 *
 * @param onClick - Callback invoked when the button is clicked
 * @param label - Text displayed on the button (default: "Ekspor")
 * @param variant - Visual variant determining the icon: `"excel"` shows a spreadsheet icon, `"csv"` shows a text/file icon (default: "excel")
 * @param size - Visual size of the button which also adjusts the icon (`"sm" | "md" | "lg"`, default: "md")
 * @returns The button element configured to trigger `onClick` and display the variant-specific icon and label
 */
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