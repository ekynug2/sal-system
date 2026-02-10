'use client';

// =============================================================================
// SAL Accounting System - Export/Print Hook
// =============================================================================

import { useCallback } from 'react';
import { exportToExcel, exportToCSV, type ExportColumn } from '@/lib/export-utils';
import { printHTML, generatePrintTable } from '@/lib/print-utils';

export interface UseExportPrintOptions<T extends object> {
    data: T[];
    exportColumns: ExportColumn<T>[];
    printColumns: { header: string; accessor: keyof T | ((row: T) => string | number); className?: string }[];
    filename: string;
    sheetName?: string;
    printTitle?: string;
    printSubtitle?: string;
}

/**
 * Provides memoized handlers to export tabular data to Excel/CSV and to print a simple HTML table.
 *
 * @param options - Configuration for exports and printing:
 *   - data: Array of row objects to export or print.
 *   - exportColumns: Column definitions used for Excel/CSV exports.
 *   - printColumns: Column definitions used to build the printable HTML table.
 *   - filename: Base filename for exported files (date will be appended).
 *   - sheetName: Optional Excel sheet name (defaults to "Sheet1").
 *   - printTitle: Optional title for the printed output.
 *   - printSubtitle: Optional subtitle for the printed output.
 * @returns An object with:
 *   - handleExportExcel: Handler that exports `data` to an Excel file.
 *   - handleExportCSV: Handler that exports `data` to a CSV file.
 *   - handlePrint: Handler that generates and prints an HTML table from `data`.
 *   - hasData: `true` if `data.length > 0`, `false` otherwise.
 */
export function useExportPrint<T extends object>(options: UseExportPrintOptions<T>) {
    const {
        data,
        exportColumns,
        printColumns,
        filename,
        sheetName,
        printTitle,
        printSubtitle
    } = options;

    const handleExportExcel = useCallback(() => {
        exportToExcel(data, exportColumns, {
            filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
            sheetName: sheetName || 'Sheet1',
        });
    }, [data, exportColumns, filename, sheetName]);

    const handleExportCSV = useCallback(() => {
        exportToCSV(data, exportColumns, {
            filename: `${filename}_${new Date().toISOString().split('T')[0]}`,
        });
    }, [data, exportColumns, filename]);

    const handlePrint = useCallback(() => {
        const html = generatePrintTable(data, printColumns, {
            title: printTitle,
            subtitle: printSubtitle,
        });
        printHTML(html, printTitle || filename);
    }, [data, printColumns, printTitle, printSubtitle, filename]);

    return {
        handleExportExcel,
        handleExportCSV,
        handlePrint,
        hasData: data.length > 0,
    };
}