import { useState, useCallback } from 'react';
import { Copy, Printer, FileSpreadsheet, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface TableColumn {
  header: string;
  key: string;
  transform?: (value: any, row: any) => string;
}

export interface DataTableToolbarProps {
  /** Data rows (already filtered) to export */
  data: Record<string, any>[];
  /** Column definitions for export */
  columns: TableColumn[];
  /** File name for Excel download (without extension) */
  fileName?: string;
  /** Table title shown when printing */
  title?: string;
  /** Current entries per page value */
  entriesPerPage: number;
  /** Callback when entries per page changes */
  onEntriesPerPageChange: (n: number) => void;
  /** Total number of filtered entries */
  totalEntries: number;
  /** Additional buttons/content to render on the right side */
  children?: React.ReactNode;
}

const ENTRIES_OPTIONS = [10, 25, 50, 100];

export const DataTableToolbar = ({
  data,
  columns,
  fileName = 'Data_Export',
  title = 'Data',
  entriesPerPage,
  onEntriesPerPageChange,
  totalEntries,
  children,
}: DataTableToolbarProps) => {
  const [copied, setCopied] = useState(false);

  const getExportData = useCallback(() => {
    return data.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.header] = col.transform
          ? col.transform(row[col.key], row)
          : (row[col.key] ?? '-');
      });
      return obj;
    });
  }, [data, columns]);

  const handleCopy = useCallback(async () => {
    const exportData = getExportData();
    const headers = columns.map((c) => c.header).join('\t');
    const rows = exportData.map((row) =>
      columns.map((c) => String(row[c.header] ?? '')).join('\t')
    );
    const text = [headers, ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getExportData, columns]);

  const handlePrint = useCallback(() => {
    const exportData = getExportData();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHTML = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:system-ui,-apple-system,sans-serif;font-size:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;font-weight:600;border:1px solid #d1d5db;">No</th>
            ${columns.map((c) => `<th style="padding:8px 12px;text-align:left;font-weight:600;border:1px solid #d1d5db;">${c.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${exportData
            .map(
              (row, i) => `
            <tr style="${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
              <td style="padding:6px 12px;border:1px solid #e5e7eb;">${i + 1}</td>
              ${columns.map((c) => `<td style="padding:6px 12px;border:1px solid #e5e7eb;">${row[c.header] ?? '-'}</td>`).join('')}
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { margin: 1cm; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; }
          h2 { margin: 0 0 12px 0; font-size: 16px; color: #111; }
          .meta { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')} &bull; Total: ${exportData.length} data</p>
        ${tableHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  }, [getExportData, columns, title]);

  const handleExcel = useCallback(() => {
    const exportData = getExportData();
    const numbered = exportData.map((row, i) => ({ No: i + 1, ...row }));
    const ws = XLSX.utils.json_to_sheet(numbered);
    // Auto column width
    const allKeys = Object.keys(numbered[0] || {});
    ws['!cols'] = allKeys.map((key) => ({
      wch: Math.max(
        key.length,
        ...numbered
          .slice(0, 100)
          .map((r) => String((r as any)[key] ?? '').length)
      ) + 2,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    import('@/lib/mobileUtils').then(m => m.downloadOrShareBlob(blob, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`));
  }, [getExportData, fileName, title]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] rounded-xl">
      {/* Left side: action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-text-primary dark:text-text-darkPrimary transition-all active:scale-95"
          title="Copy ke clipboard"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              Copy
            </>
          )}
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-text-primary dark:text-text-darkPrimary transition-all active:scale-95"
          title="Cetak tabel"
        >
          <Printer size={13} />
          Print
        </button>
        <button
          onClick={handleExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-text-primary dark:text-text-darkPrimary transition-all active:scale-95"
          title="Download Excel"
        >
          <FileSpreadsheet size={13} className="text-emerald-600" />
          Excel
        </button>

        {children && (
          <div className="flex items-center gap-1.5">{children}</div>
        )}
      </div>

      {/* Right side: show entries */}
      <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
        <span>Show</span>
        <select
          value={entriesPerPage}
          onChange={(e) => {
            const val = e.target.value;
            onEntriesPerPageChange(val === 'all' ? totalEntries : Number(val));
          }}
          className="h-7 px-2 rounded-md border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#0a0a0a] text-text-primary dark:text-text-darkPrimary text-xs outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          {ENTRIES_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="all">Semua</option>
        </select>
        <span>entries</span>
      </div>
    </div>
  );
};
