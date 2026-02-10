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
 * Export an array of objects to an Excel (.xlsx) file.
 *
 * The first row of the sheet is built from each column's `header`. Each data row is produced by applying
 * a column's `accessor` (either a property key of the item or a function) to the corresponding item.
 * Column widths use `col.width` when provided or default to 15. The workbook is saved as
 * `{options.filename}.xlsx` and the worksheet name defaults to `"Sheet1"` when `options.sheetName` is not set.
 *
 * @param data - Array of objects to export
 * @param columns - Column definitions; each column provides a `header`, an `accessor` (key or function), and optional `width`
 * @param options - Export options including `filename` and optional `sheetName`
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
 * Generate a CSV from the provided rows and columns and trigger a file download.
 *
 * Builds a header row from `columns` and maps each item in `data` to a CSV row using each column's `accessor`; values containing commas or quotes are escaped. The resulting file is saved as `<options.filename>.csv`.
 *
 * @param data - Array of data objects to export
 * @param columns - Column definitions (header and accessor) that determine CSV headers and cell values
 * @param options - Export options; `options.filename` is used as the base name for the saved file
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
 * Parse an Excel file and map rows from the first worksheet to objects of type `T`.
 *
 * @param file - The Excel file to read (e.g., .xlsx or .xls)
 * @param columnMapping - An object mapping Excel header names to target keys on `T`
 * @returns An array of `T` where each element corresponds to a row from the first worksheet; values are assigned to keys according to `columnMapping`
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
 * Create and download an Excel template file with the given headers and example values.
 *
 * The generated workbook contains a single sheet named "Template" where the first row
 * is the provided headers and the second row contains example values (empty when not provided).
 * The saved file is named `{filename}_template.xlsx`.
 *
 * @param columns - Array of column descriptors. Each descriptor must include `header` and may include `example` used in the second row.
 * @param filename - Base filename (without extension) used when saving the generated template.
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
 * Format a number as Indonesian-style decimal currency without fractional digits.
 *
 * @returns A string formatted with the Indonesian locale ('id-ID') using no decimal places
 */
export function formatCurrencyForExport(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Format an input date string into the Indonesian date format (dd/mm/yyyy).
 *
 * @param dateString - A date string parseable by JavaScript's Date constructor
 * @returns The date formatted using the 'id-ID' locale with numeric year and two-digit month and day (dd/mm/yyyy)
 */
export function formatDateForExport(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}