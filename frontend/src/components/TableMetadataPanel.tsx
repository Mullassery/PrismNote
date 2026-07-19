import { useState, useMemo } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useSchemaCache } from '../hooks/useSchemaCache'
import { queryDatabase } from '../api/data'

type Tab = 'columns' | 'preview' | 'stats'
type DbType = 'postgresql' | 'mysql' | 'sqlite' | 'duckdb' | 'snowflake' | 'bigquery'

interface TableMetadataPanelProps {
  connId: string
  dbType: DbType
  tableName: string
  schemaName: string
  onClose: () => void
}

export default function TableMetadataPanel({
  connId,
  dbType: _dbType,
  tableName,
  schemaName,
  onClose,
}: TableMetadataPanelProps) {
  const schemaCache = useSchemaCache()
  const [activeTab, setActiveTab] = useState<Tab>('columns')
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [statsData, setStatsData] = useState<{ rowCount: number; sizeBytes?: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null)
  const [columnProfiles, setColumnProfiles] = useState<Record<string, any>>({})

  const detail = schemaCache.tableDetails[`${connId}.${schemaName}.${tableName}`]

  // Fetch preview data when tab changes
  const loadPreview = async () => {
    if (previewData) return
    setPreviewLoading(true)
    try {
      const table = `${schemaName ? `"${schemaName}".` : ''}"${tableName}"`
      const response = await queryDatabase(connId, `SELECT * FROM ${table} LIMIT 10`)
      if (response) {
        setPreviewData(response.rows)
      }
    } catch (err) {
      console.error('Failed to load preview:', err)
      setPreviewData([])
    } finally {
      setPreviewLoading(false)
    }
  }

  // Fetch stats when tab changes
  const loadStats = async () => {
    if (statsData) return
    setStatsLoading(true)
    try {
      const table = `${schemaName ? `"${schemaName}".` : ''}"${tableName}"`
      const response = await queryDatabase(connId, `SELECT COUNT(*) AS cnt FROM ${table}`)
      if (response?.rows?.[0]) {
        setStatsData({ rowCount: response.rows[0][0] })
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  // Profile a column
  const profileColumn = async (columnName: string) => {
    if (columnProfiles[columnName]) return

    try {
      const col = `"${columnName}"`
      const table = `${schemaName ? `"${schemaName}".` : ''}"${tableName}"`
      const response = await queryDatabase(
        connId,
        `SELECT COUNT(*) AS cnt, COUNT(${col}) AS non_null, COUNT(DISTINCT ${col}) AS dist FROM ${table}`
      )
      if (response?.rows?.[0]) {
        setColumnProfiles({
          ...columnProfiles,
          [columnName]: {
            count: response.rows[0][0],
            nonNull: response.rows[0][1],
            distinct: response.rows[0][2],
            nullPercent: Math.round((1 - response.rows[0][1] / response.rows[0][0]) * 100),
          },
        })
      }
    } catch (err) {
      console.error(`Failed to profile column ${columnName}:`, err)
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'columns', label: 'Columns' },
    { id: 'preview', label: 'Preview' },
    { id: 'stats', label: 'Stats' },
  ]

  return (
    <div className="w-80 shrink-0 flex flex-col pn-surface border-l pn-bd overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b pn-bd shrink-0">
        <div>
          <div className="text-sm font-semibold pn-text">{tableName}</div>
          <div className="text-xs pn-faint">{schemaName}</div>
        </div>
        <button onClick={onClose} className="p-1 pn-hover rounded hover:bg-red-500/10">
          <X size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="h-8 flex items-stretch border-b pn-bd shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              if (tab.id === 'preview' && !previewData) loadPreview()
              if (tab.id === 'stats' && !statsData) loadStats()
            }}
            className={`flex-1 flex items-center justify-center text-xs transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-400 pn-text'
                : 'border-transparent pn-muted hover:pn-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Columns tab */}
        {activeTab === 'columns' && detail?.status === 'ready' && (
          <div>
            {detail.columns.map((col) => {
              const pk = detail.constraints?.find((c) => c.type === 'PRIMARY_KEY' && c.column === col.name)
              const fk = detail.constraints?.find((c) => c.type === 'FOREIGN_KEY' && c.column === col.name)
              const inferred = detail.inferredFks?.find((r) => r.fromColumn === col.name)
              const profile = columnProfiles[col.name]
              const isExpanded = expandedColumn === col.name

              return (
                <div key={col.name} className="border-b pn-bd last:border-b-0">
                  {/* Column header */}
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedColumn(null)
                      } else {
                        setExpandedColumn(col.name)
                        profileColumn(col.name)
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-xs pn-hover hover:bg-pn-hover transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="pn-text font-medium truncate flex items-center gap-1">
                          {pk && <span className="text-yellow-500">🔑</span>}
                          {inferred && <span className="text-blue-400">⟶</span>}
                          {col.name}
                        </div>
                        <div className="pn-faint text-[11px]">
                          {col.type}
                          {col.nullable ? ' (nullable)' : ' (NOT NULL)'}
                        </div>
                      </div>
                      {fk && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1 rounded">FK</span>}
                    </div>
                  </button>

                  {/* Profile expansion */}
                  {isExpanded && profile && (
                    <div className="px-3 py-2 bg-pn-hover/50 border-t pn-bd text-xs pn-faint space-y-1">
                      <div className="flex justify-between">
                        <span>Total rows:</span>
                        <span className="pn-text font-mono">{profile.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Non-null:</span>
                        <span className="pn-text font-mono">{profile.nonNull}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distinct:</span>
                        <span className="pn-text font-mono">{profile.distinct}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Null %:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-pn-hover rounded overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${profile.nullPercent}%` }}
                            />
                          </div>
                          <span className="font-mono">{profile.nullPercent}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div>
            {previewLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin pn-muted" />
              </div>
            )}
            {previewData && previewData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-pn-hover border-b pn-bd pn-text">
                    {detail?.columns && (
                      <tr>
                        {detail.columns.map((col) => (
                          <th key={col.name} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b pn-bd hover:bg-pn-hover/30">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-2 py-1 pn-text truncate max-w-xs" title={String(val)}>
                            {val === null ? <span className="pn-faint italic">null</span> : String(val).slice(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {previewData && previewData.length === 0 && <div className="p-4 pn-faint text-xs">No data in table</div>}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div className="p-4 space-y-4">
            {statsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin pn-muted" />
              </div>
            )}
            {statsData && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="pn-faint text-xs mb-1">Total Rows</div>
                  <div className="text-lg font-semibold pn-text font-mono">{statsData.rowCount.toLocaleString()}</div>
                </div>
                {statsData.sizeBytes !== undefined && (
                  <div>
                    <div className="pn-faint text-xs mb-1">Table Size</div>
                    <div className="text-lg font-semibold pn-text font-mono">
                      {(statsData.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}
                <div className="pn-faint text-xs">Size unavailable for this database type</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
