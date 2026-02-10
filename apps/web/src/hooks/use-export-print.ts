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
