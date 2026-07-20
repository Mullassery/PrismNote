/**
 * SqlConnectionPicker — Select database connection for SQL cells
 * Shows available connections with dialect icons and auto-detects dialect
 */

import { useState, useEffect } from 'react'
import { ChevronDown, Database, Loader2 } from 'lucide-react'
import { listDatabases } from '../api/data'
import { detectSqlDialect, getSqlDialect } from '../lib/languages'
import type { DbConnection } from '../api/data'

interface SqlConnectionPickerProps {
  selectedConnId?: string
  onSelect: (connId: string, dbType: string) => void
  disabled?: boolean
}

export default function SqlConnectionPicker({
  selectedConnId,
  onSelect,
  disabled = false,
}: SqlConnectionPickerProps) {
  const [connections, setConnections] = useState<DbConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // Load connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await listDatabases()
        const conns = (response.data || response) as DbConnection[]
        setConnections(conns)

        // Auto-select first connection if none selected
        if (!selectedConnId && conns.length > 0) {
          onSelect(conns[0].id, conns[0].db_type || 'postgresql')
        }
      } catch (err) {
        console.error('Failed to load connections:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConnections()
  }, [selectedConnId, onSelect])

  const selectedConn = connections.find((c) => c.id === selectedConnId)
  const selectedDialect = selectedConn ? detectSqlDialect(selectedConn.db_type) : null

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs pn-faint">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading databases...</span>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="px-3 py-2 text-xs pn-faint">
        <span>No database connections available</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Selected connection button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
        }`}
      >
        <Database size={14} />
        <span className="flex-1 text-left">
          {selectedConn?.name || 'Select connection'}
        </span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {open && !disabled && (
        <div className="absolute top-10 left-0 z-20 min-w-[250px] pn-surface border pn-bd rounded-lg shadow-lg py-1">
          {connections.map((conn) => {
            const dialect = detectSqlDialect(conn.db_type)
            const dialectConfig = getSqlDialect(dialect)

            return (
              <button
                key={conn.id}
                onClick={() => {
                  onSelect(conn.id, conn.db_type || 'postgresql')
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                  selectedConnId === conn.id
                    ? 'bg-blue-500/20 pn-text'
                    : 'pn-faint hover:pn-text'
                }`}
              >
                <Database size={14} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{conn.name}</div>
                  <div className="text-[11px] opacity-75">{dialectConfig.name}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
