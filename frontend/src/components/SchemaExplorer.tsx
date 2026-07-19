import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Database as DatabaseIcon, Loader2, AlertCircle, RotateCcw, Search, X } from 'lucide-react'
import { useSchemaCache } from '../hooks/useSchemaCache'
import { listDatabases } from '../api/data'
import type { DbConnection } from '../api/data'

interface SchemaExplorerProps {
  onSelectTable: (connId: string, tableName: string, schemaName: string, dbType: string) => void
}

interface ColumnRow {
  name: string
  type: string
  nullable: boolean
  isPk?: boolean
  isFk?: boolean
}

export default function SchemaExplorer({ onSelectTable }: SchemaExplorerProps) {
  const schemaCache = useSchemaCache()
  const [connections, setConnections] = useState<DbConnection[]>([])
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Load connections on mount
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await listDatabases()
        const conns = (response.data || response) as DbConnection[]
        setConnections(conns)
        // Auto-expand first connection
        if (conns.length > 0) {
          setExpandedConnections(new Set([conns[0].id]))
          schemaCache.fetchSchema(conns[0].id, (conns[0].db_type || 'postgresql') as any)
        }
      } catch (err) {
        console.error('Failed to load connections:', err)
      } finally {
        setLoading(false)
      }
    }
    loadConnections()
  }, [schemaCache])

  const toggleConnection = (connId: string, dbType: string) => {
    const newExpanded = new Set(expandedConnections)
    if (newExpanded.has(connId)) {
      newExpanded.delete(connId)
    } else {
      newExpanded.add(connId)
      schemaCache.fetchSchema(connId, dbType as any)
    }
    setExpandedConnections(newExpanded)
  }

  const toggleTable = (tableKey: string, connId: string, tableName: string, dbType: string, schemaName?: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableKey)) {
      newExpanded.delete(tableKey)
    } else {
      newExpanded.add(tableKey)
      schemaCache.fetchTableDetail(connId, dbType as any, tableName, schemaName)
    }
    setExpandedTables(newExpanded)
  }

  // Filter tables by search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery) return connections
    return connections.map((conn) => {
      const schema = schemaCache.schemas[conn.id]
      if (!schema) return conn
      const filtered = schema.tables.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      return { ...conn, _filteredTables: filtered }
    })
  }, [searchQuery, connections, schemaCache.schemas])

  if (loading) {
    return (
      <aside className="w-64 shrink-0 pn-surface border-r pn-bd flex flex-col overflow-hidden select-none">
        <div className="h-8 flex items-center justify-center pn-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      </aside>
    )
  }

  if (connections.length === 0) {
    return (
      <aside className="w-64 shrink-0 pn-surface border-r pn-bd flex flex-col overflow-hidden select-none">
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div className="text-sm pn-muted">
            <DatabaseIcon size={32} className="mx-auto mb-2 pn-faint" />
            <p>No database connections</p>
            <p className="text-xs mt-2 pn-faint">Connect a database in the SQL panel</p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 shrink-0 pn-surface border-r pn-bd flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-2 border-b pn-bd shrink-0">
        <span className="text-xs font-bold uppercase tracking-wide pn-text">Schema</span>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-0.5 pn-hover rounded">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b pn-bd shrink-0">
        <div className="flex items-center gap-1 bg-pn-hover rounded px-2 h-6">
          <Search size={12} className="pn-muted" />
          <input
            type="text"
            placeholder="Filter tables..."
            className="flex-1 bg-transparent text-xs pn-text placeholder-pn-faint outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Connections list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConnections.map((conn) => {
          const schema = schemaCache.schemas[conn.id]
          const isExpanded = expandedConnections.has(conn.id)
          const tables = (conn as any)._filteredTables || schema?.tables || []

          return (
            <div key={conn.id} className="border-b pn-bd last:border-b-0">
              {/* Connection header */}
              <button
                onClick={() => toggleConnection(conn.id, conn.db_type || 'postgresql')}
                className="w-full px-2 py-1.5 h-8 flex items-center gap-1 pn-hover hover:bg-pn-hover transition-colors"
              >
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
                <DatabaseIcon size={14} className="text-blue-400 shrink-0" />
                <span className="text-xs pn-text truncate flex-1 text-left">{conn.name}</span>
                <span className="text-[10px] pn-faint shrink-0">{conn.db_type}</span>
                {schema?.status === 'loading' && <Loader2 size={12} className="animate-spin" />}
              </button>

              {/* Tables list */}
              {isExpanded && (
                <div className="bg-pn-hover/30">
                  {schema?.status === 'error' && (
                    <div className="px-2 py-1 flex items-center gap-2 text-xs pn-faint">
                      <AlertCircle size={12} />
                      <span>{schema.error || 'Failed to load schema'}</span>
                      <button
                        onClick={() => schemaCache.fetchSchema(conn.id, conn.db_type as any)}
                        className="pn-hover rounded p-0.5"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  )}

                  {(tables || []).map((table: any) => {
                    const tableKey = `${conn.id}.${table.schema}.${table.name}`
                    const tableExpanded = expandedTables.has(tableKey)
                    const detail = schemaCache.tableDetails[tableKey]

                    return (
                      <div key={tableKey}>
                        {/* Table row */}
                        <button
                          onClick={() => {
                            setSelectedTable(tableKey)
                            toggleTable(tableKey, conn.id, table.name, conn.db_type || 'postgresql', table.schema)
                            onSelectTable(conn.id, table.name, table.schema || 'public', conn.db_type || 'postgresql')
                          }}
                          className={`w-full px-2 py-1 h-[22px] flex items-center gap-1 text-xs transition-colors ${
                            selectedTable === tableKey
                              ? 'bg-blue-500/25 pn-text'
                              : 'pn-text hover:bg-pn-hover'
                          }`}
                        >
                          <ChevronRight
                            size={12}
                            className={`shrink-0 transition-transform ${tableExpanded ? 'rotate-90' : ''}`}
                          />
                          <span className="text-xs">📋</span>
                          <span className="truncate flex-1 text-left">{table.name}</span>
                          {detail?.status === 'loading' && <Loader2 size={10} className="animate-spin" />}
                        </button>

                        {/* Columns list */}
                        {tableExpanded && detail?.status === 'ready' && (
                          <div className="bg-pn-hover/50">
                            {detail.columns.map((col) => {
                              const fk = detail.inferredFks?.find((f) => f.fromColumn === col.name)
                              const pk = detail.constraints?.find((c) => c.type === 'PRIMARY_KEY' && c.column === col.name)

                              return (
                                <div
                                  key={col.name}
                                  className="h-5 px-2 py-0.5 flex items-center gap-1 pn-faint hover:pn-text text-[11px] pl-6"
                                  title={`${col.type}${col.nullable ? '' : ' NOT NULL'}`}
                                >
                                  {pk ? <span>🔑</span> : fk ? <span>⟶</span> : <span>#</span>}
                                  <span className="truncate">{col.name}</span>
                                  <span className="ml-auto shrink-0 text-[10px] pn-faint">{col.type}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
