// =============================================================================
// SAL Accounting System - Export/Import Utilities
// =============================================================================

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn<T> {
    header: string;
    accessor: keyof T | ((row: T) => string | number | boolean | null | undefined);
    width?: number;
}

export interface ExportOptions {
    filename: string;
    sheetName?: string;
}

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends object>(
    data: T[],
    columns: ExportColumn<T>[],
    options: ExportOptions
): void {
    // Transform data to rows
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            if (typeof col.accessor === 'function') {
                return col.accessor(item);
            }
            return item[col.accessor];
        })
    );

    // Create worksheet with headers and data
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');

    // Generate buffer and save
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `${options.filename}.xlsx`);
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends object>(
    data: T[],
    columns: ExportColumn<T>[],
    options: ExportOptions
): void {
    // Transform data to rows
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            if (typeof col.accessor === 'function') {
                const value = col.accessor(item);
                // Escape quotes and wrap in quotes if contains comma
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }
            const value = item[col.accessor];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        })
    );

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and save
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${options.filename}.csv`);
}

/**
 * Parse Excel file and return data
 */
export async function parseExcel<T>(
    file: File,
    columnMapping: Record<string, keyof T>
): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

                // Map columns to expected format
                const mappedData = jsonData.map(row => {
                    const mappedRow: Partial<T> = {};
                    for (const [excelHeader, targetKey] of Object.entries(columnMapping)) {
                        if (row[excelHeader] !== undefined) {
                            (mappedRow as Record<string, unknown>)[targetKey as string] = row[excelHeader];
                        }
                    }
                    return mappedRow as T;
                });

                resolve(mappedData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Generate Excel template for import
 */
export function generateImportTemplate(
    columns: { header: string; example?: string }[],
    filename: string
): void {
    const headers = columns.map(col => col.header);
    const examples = columns.map(col => col.example || '');

    const wsData = [headers, examples];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = columns.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, `${filename}_template.xlsx`);
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format date for export
 */
export function formatDateForExport(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}
