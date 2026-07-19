/**
 * SqlResultsView — Display SQL query results in table format
 * Handles pagination, sorting, and export options
 */

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Download, Copy } from 'lucide-react'
import type { QueryResult } from '../lib/sqlExecutor'

interface SqlResultsViewProps {
  result: QueryResult
  onExport?: (format: 'csv' | 'json') => void
}

const ROWS_PER_PAGE = 50

export default function SqlResultsView({ result, onExport }: SqlResultsViewProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const pagination = useMemo(() => {
    const totalPages = Math.ceil(result.rowCount / ROWS_PER_PAGE)
    const startIdx = (currentPage - 1) * ROWS_PER_PAGE
    const endIdx = Math.min(startIdx + ROWS_PER_PAGE, result.rowCount)
    const pageRows = result.rows.slice(startIdx, endIdx)

    return { totalPages, startIdx, endIdx, pageRows }
  }, [result, currentPage])

  const handleCopyToClipboard = () => {
    // Format as TSV for easy pasting into Excel/Sheets
    const header = result.columns.join('\t')
    const rows = result.rows
      .map((row) => row.map((val) => formatCellValue(val)).join('\t'))
      .join('\n')
    const tsv = `${header}\n${rows}`

    navigator.clipboard.writeText(tsv).then(() => {
      alert('Results copied to clipboard (TSV format)')
    })
  }

  const handleExportCsv = () => {
    const header = result.columns.map(escapeCsvValue).join(',')
    const rows = result.rows
      .map((row) => row.map((val) => escapeCsvValue(formatCellValue(val))).join(','))
      .join('\n')
    const csv = `${header}\n${rows}`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    const data = result.rows.map((row) => {
      const obj: Record<string, any> = {}
      result.columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj
    })

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border pn-bd rounded text-xs">
        <div className="pn-text">
          <span className="font-semibold">{result.rowCount}</span> rows
          {result.executionTimeMs && (
            <span className="ml-2 pn-faint">in {(result.executionTimeMs / 1000).toFixed(2)}s</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopyToClipboard}
            className="p-1.5 rounded pn-hover hover:bg-blue-500/20 transition"
            title="Copy as TSV"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2 py-1.5 rounded pn-hover hover:bg-blue-500/20 transition text-[11px]"
            title="Export as CSV"
          >
            <Download size={12} />
            CSV
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-1.5 rounded pn-hover hover:bg-blue-500/20 transition text-[11px]"
            title="Export as JSON"
          >
            <Download size={12} />
            JSON
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto border pn-bd rounded-lg">
        <table className="w-full text-xs">
          {/* Header */}
          <thead>
            <tr className="bg-pn-hover border-b pn-bd">
              <th className="px-3 py-2 text-left font-semibold pn-muted w-12">#</th>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold pn-text whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {pagination.pageRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b pn-bd hover:bg-pn-hover/50 transition"
              >
                <td className="px-3 py-2 pn-muted text-right">
                  {pagination.startIdx + rowIdx + 1}
                </td>
                {row.map((val, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-3 py-2 pn-text max-w-sm truncate"
                    title={String(val)}
                  >
                    {renderCellValue(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs pn-muted">
          <span>
            {pagination.startIdx + 1} – {pagination.endIdx} of {result.rowCount}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-pn-hover disabled:opacity-50"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 py-1">
              Page {currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
              disabled={currentPage === pagination.totalPages}
              className="p-1 rounded hover:bg-pn-hover disabled:opacity-50"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Format cell value for display
 */
function formatCellValue(val: any): string {
  if (val === null || val === undefined) return '(null)'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

/**
 * Render cell value with syntax highlighting
 */
function renderCellValue(val: any) {
  if (val === null || val === undefined) {
    return <span className="pn-muted italic">(null)</span>
  }

  if (typeof val === 'boolean') {
    return (
      <span className={val ? 'text-green-400' : 'text-red-400'}>
        {val ? 'true' : 'false'}
      </span>
    )
  }

  if (typeof val === 'number') {
    return <span className="text-yellow-400 font-mono">{val}</span>
  }

  if (typeof val === 'object') {
    return (
      <code className="text-xs pn-faint bg-pn-hover/50 px-1 py-0.5 rounded">
        {JSON.stringify(val).slice(0, 50)}…
      </code>
    )
  }

  return String(val).slice(0, 100)
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCsvValue(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}
