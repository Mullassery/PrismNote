import { useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft, Loader } from 'lucide-react'

interface LineageNode {
  table_id: string
  column_name: string
  data_type?: string
}

interface LineageData {
  column: LineageNode
  upstream: LineageNode[]
  downstream: LineageNode[]
  operations: string[]
}

interface LineageViewerProps {
  table: string
  column: string
  onClose: () => void
}

export default function LineageViewer({ table, column, onClose }: LineageViewerProps) {
  const [lineage, setLineage] = useState<LineageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState<'upstream' | 'downstream'>('upstream')

  useEffect(() => {
    const fetchLineage = async () => {
      try {
        const response = await fetch(`/api/lineage/${table}/${column}`)
        if (response.ok) {
          const data = await response.json()
          setLineage(data)
        }
      } catch (error) {
        console.error('Failed to fetch lineage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLineage()
  }, [table, column])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 flex items-center gap-3">
          <Loader size={16} className="animate-spin" />
          <span className="pn-text">Loading lineage…</span>
        </div>
      </div>
    )
  }

  if (!lineage) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 max-w-md">
          <p className="pn-text">No lineage data available for this column.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const chain = direction === 'upstream' ? lineage.upstream : lineage.downstream

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold pn-text">Column Lineage</h3>
            <p className="text-xs pn-faint mt-1">
              {table}.{column}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Direction Toggle */}
        <div className="px-4 py-3 border-b border-slate-700 flex gap-2">
          <button
            onClick={() => setDirection('upstream')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition ${
              direction === 'upstream'
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <ChevronLeft size={14} />
            Upstream Sources
          </button>
          <button
            onClick={() => setDirection('downstream')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition ${
              direction === 'downstream'
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            Downstream Impact
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Lineage Flow */}
        <div className="flex-1 overflow-y-auto p-4">
          {chain.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm pn-faint">
              No {direction === 'upstream' ? 'source' : 'dependent'} columns found
            </div>
          ) : (
            <div className="space-y-3">
              {/* Source/Target Column */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="font-mono text-xs text-blue-300 mb-1">Current Column</div>
                <div className="text-sm pn-text">{column}</div>
                {lineage.column.data_type && (
                  <div className="text-xs pn-faint mt-1">{lineage.column.data_type}</div>
                )}
              </div>

              {/* Operations */}
              {lineage.operations.length > 0 && (
                <div className="px-3 py-2 bg-slate-800/50 rounded border border-slate-700/30">
                  <div className="text-xs pn-faint mb-1">Operations</div>
                  <div className="flex flex-wrap gap-1">
                    {lineage.operations.map((op, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 font-mono"
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs pn-faint">
                  {direction === 'upstream' ? '← Sources' : 'Impact →'}
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* Upstream/Downstream Columns */}
              <div className="space-y-2">
                {chain.map((node, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-emerald-300 truncate">
                          {node.table_id}.{node.column_name}
                        </div>
                        {node.data_type && (
                          <div className="text-xs pn-faint mt-1">{node.data_type}</div>
                        )}
                      </div>
                      <div className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 shrink-0">
                        {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs pn-faint">
                <strong>{chain.length}</strong> {direction === 'upstream' ? 'source' : 'dependent'}{' '}
                {chain.length === 1 ? 'column' : 'columns'} found
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
