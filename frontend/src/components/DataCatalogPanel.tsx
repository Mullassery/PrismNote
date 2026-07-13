import { useEffect, useState } from 'react'
import { Search, Tag, AlertCircle, Database, Lock, Globe, Eye, EyeOff, Filter, Plus } from 'lucide-react'

interface CatalogEntry {
  catalog_id: string
  table_name: string
  source_type: string
  row_count: number
  columns: number
  tags: string[]
  owner?: string
  description?: string
  created_at: string
  pii_indicators?: boolean
}

interface ColumnInfo {
  name: string
  data_type: string
  nullable: boolean
  pii_category?: string
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted'
}

export default function DataCatalogPanel() {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pii' | 'public' | 'recent'>('all')

  useEffect(() => {
    fetchCatalog()
  }, [filter])

  const fetchCatalog = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'pii') params.append('pii_only', 'true')

      const response = await fetch(`/api/catalog/list?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Failed to fetch catalog:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      fetchCatalog()
      return
    }

    try {
      const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.results || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleSelectEntry = async (entry: CatalogEntry) => {
    setSelectedEntry(entry)
    // TODO: Fetch detailed column information
    setColumns([])
  }

  const getSensitivityColor = (sensitivity?: string) => {
    switch (sensitivity) {
      case 'restricted':
        return 'text-red-400 bg-red-500/10'
      case 'confidential':
        return 'text-amber-400 bg-amber-500/10'
      case 'internal':
        return 'text-blue-400 bg-blue-500/10'
      case 'public':
        return 'text-emerald-400 bg-emerald-500/10'
      default:
        return 'text-slate-400 bg-slate-500/10'
    }
  }

  const getPiiIcon = (category?: string) => {
    if (!category) return null
    switch (category) {
      case 'Email':
      case 'Phone':
        return <AlertCircle size={12} className="text-orange-400" />
      case 'SocialSecurityNumber':
      case 'CreditCard':
        return <Lock size={12} className="text-red-400" />
      default:
        return <Eye size={12} className="text-yellow-400" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 border-r pn-bd">
      {/* Header */}
      <div className="p-4 border-b pn-bd">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-sky-400" />
          <h2 className="font-bold pn-text">Data Catalog</h2>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
          <Search size={14} className="pn-faint" />
          <input
            type="text"
            placeholder="Search tables, columns, owners…"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm pn-text"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 text-[11px]">
          {(['all', 'pii', 'public', 'recent'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded transition ${
                filter === f
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              {f === 'all' && 'All'}
              {f === 'pii' && '🔒 PII'}
              {f === 'public' && '🌐 Public'}
              {f === 'recent' && '⏰ Recent'}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout: List and Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Catalog List */}
        <div className="w-64 border-r pn-bd overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center pn-faint text-sm">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center pn-faint text-sm">No tables found</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {entries.map((entry) => (
                <button
                  key={entry.catalog_id}
                  onClick={() => handleSelectEntry(entry)}
                  className={`w-full text-left p-3 hover:bg-slate-800/50 transition border-l-2 ${
                    selectedEntry?.catalog_id === entry.catalog_id
                      ? 'border-blue-500 bg-slate-800/30'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm pn-text truncate">
                        {entry.table_name}
                      </div>
                      <div className="text-[11px] pn-faint mt-0.5">
                        {entry.columns} columns · {entry.row_count.toLocaleString()} rows
                      </div>
                    </div>
                    {entry.pii_indicators && (
                      <Lock size={13} className="text-red-400 shrink-0" />
                    )}
                  </div>

                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {entry.tags.length > 2 && (
                        <span className="text-[9px] px-1.5 py-0.5 text-slate-400">
                          +{entry.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedEntry ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div>
                <h3 className="text-lg font-bold pn-text mb-2">{selectedEntry.table_name}</h3>
                {selectedEntry.description && (
                  <p className="text-sm pn-muted">{selectedEntry.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs pn-faint">
                  <span>{selectedEntry.source_type}</span>
                  <span>•</span>
                  <span>{selectedEntry.row_count.toLocaleString()} rows</span>
                  <span>•</span>
                  <span>{new Date(selectedEntry.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Owner & Tags */}
              {selectedEntry.owner && (
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                  <div className="text-xs pn-faint mb-1">Owner</div>
                  <div className="text-sm pn-text">{selectedEntry.owner}</div>
                </div>
              )}

              {/* Governance Info */}
              <div className="space-y-2">
                <div className="text-sm font-semibold pn-text">Governance</div>
                <div className="space-y-2">
                  {selectedEntry.pii_indicators && (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                      <Lock size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-300">
                        Contains PII data — requires encryption and access control
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {selectedEntry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300"
                      >
                        <Tag size={11} className="inline mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columns Section */}
              {columns.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold pn-text">Columns</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {columns.map((col) => (
                      <div
                        key={col.name}
                        className="p-2 rounded bg-slate-900/50 border border-slate-700/30 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-blue-300">{col.name}</span>
                          {getPiiIcon(col.pii_category)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400">{col.data_type}</span>
                          {col.sensitivity && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${getSensitivityColor(col.sensitivity)}`}>
                              {col.sensitivity}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm font-medium transition">
                  View Lineage
                </button>
                <button className="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition">
                  Quality Checks
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center pn-faint">
            <div className="text-center">
              <Database size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a table to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
